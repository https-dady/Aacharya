import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import batchManagementService from '../../services/batchManagementService.js';
import facultyManagementService from '../../services/facultyManagementService.js';
import sectionManagementService from '../../services/sectionManagementService.js';
import timetableService from '../../services/timetableService.js';

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const INITIAL_FORM = {
  day: '',
  courseId: '',
  facultyId: '',
  batchId: '',
  sectionId: '',
  startTime: '',
  endTime: '',
  room: '',
};

const PAGE_SIZE = 100;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function getResponseData(response) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        'The server returned an unsuccessful response.',
    );
  }

  return payload.data ?? {};
}

function getRecordId(record) {
  if (!record) {
    return '';
  }

  if (typeof record === 'string') {
    return record;
  }

  return String(record.id ?? record._id ?? '');
}

function getRecordName(record) {
  if (!record) {
    return 'Unnamed';
  }

  if (typeof record === 'string') {
    return record;
  }

  return (
    record.fullName ||
    record.title ||
    record.name ||
    record.code ||
    record.institutionalId ||
    'Unnamed'
  );
}

function getCourseName(course) {
  const title = course.title || course.name || 'Untitled course';
  const code = course.code || course.courseCode;

  return code ? `${code} — ${title}` : title;
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function isCancelledRequest(error, signal) {
  return (
    signal?.aborted ||
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError'
  );
}

function getActiveRecords(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records.filter(
    (record) =>
      String(record.status || 'ACTIVE').toUpperCase() === 'ACTIVE',
  );
}

function getAssignedIds(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .map(getRecordId)
    .filter(Boolean);
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled = false,
  getOptionLabel = getRecordName,
}) {
  const errorId = `${id}-error`;

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-[#D0D0D8]"
      >
        {label}
        <span className="ml-1 text-red-400">*</span>
      </label>

      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        required
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="w-full rounded-xl border border-[#383943] bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#B9A4FF] focus:ring-2 focus:ring-[#B9A4FF]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => {
          const optionId = getRecordId(option);

          return (
            <option key={optionId} value={optionId}>
              {getOptionLabel(option)}
            </option>
          );
        })}
      </select>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function TimeField({
  id,
  label,
  value,
  onChange,
  error,
}) {
  const errorId = `${id}-error`;

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-[#D0D0D8]"
      >
        {label}
        <span className="ml-1 text-red-400">*</span>
      </label>

      <input
        id={id}
        name={id}
        type="time"
        value={value}
        onChange={onChange}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="w-full rounded-xl border border-[#383943] bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#B9A4FF] focus:ring-2 focus:ring-[#B9A4FF]/20"
      />

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function CreateTimetable() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);

  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [saving, setSaving] = useState(false);

  const [directoryError, setDirectoryError] = useState('');
  const [sectionError, setSectionError] = useState('');
  const [formError, setFormError] = useState('');

  const [directoryReloadKey, setDirectoryReloadKey] = useState(0);
  const [sectionReloadKey, setSectionReloadKey] = useState(0);

  const loadDirectory = useCallback(async (signal) => {
    setLoadingDirectory(true);
    setDirectoryError('');

    try {
      const [
        courseResponse,
        facultyResult,
        batchResult,
      ] = await Promise.all([
        api.get('/v1/courses/department', {
          params: {
            page: 1,
            limit: PAGE_SIZE,
            status: 'ACTIVE',
          },
          signal,
        }),

        facultyManagementService.listFaculty(
          {
            page: 1,
            limit: PAGE_SIZE,
            status: 'ACTIVE',
          },
          { signal },
        ),

        batchManagementService.listBatches(
          {
            page: 1,
            limit: PAGE_SIZE,
            status: 'ACTIVE',
          },
          { signal },
        ),
      ]);

      if (signal?.aborted) {
        return;
      }

      const courseData = getResponseData(courseResponse);

      if (!Array.isArray(courseData.courses)) {
        throw new Error(
          'The server returned an invalid department course list.',
        );
      }

      setCourses(getActiveRecords(courseData.courses));
      setFaculty(getActiveRecords(facultyResult.faculty));
      setBatches(getActiveRecords(batchResult.batches));
    } catch (error) {
      if (isCancelledRequest(error, signal)) {
        return;
      }

      setDirectoryError(
        getErrorMessage(
          error,
          'Unable to load courses, faculty, and batches.',
        ),
      );
    } finally {
      if (!signal?.aborted) {
        setLoadingDirectory(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        loadDirectory(controller.signal);
      }
    });

    return () => {
      controller.abort();
    };
  }, [loadDirectory, directoryReloadKey]);

  useEffect(() => {
    if (!form.batchId) {
      return undefined;
    }

    const controller = new AbortController();

    Promise.resolve().then(async () => {
      if (controller.signal.aborted) {
        return;
      }

      setLoadingSections(true);
      setSectionError('');

      try {
        const result = await sectionManagementService.listSections({
          batchId: form.batchId,
          page: 1,
          limit: PAGE_SIZE,
          status: 'ACTIVE',
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        setSections(getActiveRecords(result.sections));
      } catch (error) {
        if (isCancelledRequest(error, controller.signal)) {
          return;
        }

        setSections([]);

        setSectionError(
          getErrorMessage(
            error,
            'Unable to load sections for the selected batch.',
          ),
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSections(false);
        }
      }
    });

    return () => {
      controller.abort();
    };
  }, [form.batchId, sectionReloadKey]);

  const selectedCourse = courses.find(
    (course) => getRecordId(course) === form.courseId,
  );

  const assignedBatchIds = getAssignedIds(
    selectedCourse?.batches,
  );

  const assignedSectionIds = getAssignedIds(
    selectedCourse?.sections,
  );

  const availableBatches =
    assignedBatchIds.length > 0
      ? batches.filter((batch) =>
          assignedBatchIds.includes(getRecordId(batch)),
        )
      : batches;

  const availableSections =
    assignedSectionIds.length > 0
      ? sections.filter((section) =>
          assignedSectionIds.includes(getRecordId(section)),
        )
      : sections;

  function handleChange(event) {
    const { name, value } = event.target;

    let nextForm = {
      ...form,
      [name]: value,
    };

    if (name === 'courseId') {
      const nextCourse = courses.find(
        (course) => getRecordId(course) === value,
      );

      const nextBatchIds = getAssignedIds(nextCourse?.batches);
      const nextSectionIds = getAssignedIds(nextCourse?.sections);

      if (
        nextBatchIds.length > 0 &&
        !nextBatchIds.includes(form.batchId)
      ) {
        nextForm.batchId = '';
        nextForm.sectionId = '';
      } else if (
        nextSectionIds.length > 0 &&
        !nextSectionIds.includes(form.sectionId)
      ) {
        nextForm.sectionId = '';
      }
    }

    if (name === 'batchId') {
      nextForm.sectionId = '';
    }

    setForm(nextForm);

    setErrors((current) => ({
      ...current,
      [name]: '',
      ...(name === 'courseId'
        ? {
            batchId: '',
            sectionId: '',
          }
        : {}),
      ...(name === 'batchId'
        ? { sectionId: '' }
        : {}),
    }));

    if (nextForm.batchId !== form.batchId) {
      setSections([]);
      setSectionError('');
      setLoadingSections(false);
    }

    setFormError('');
  }

  function validateForm() {
    const nextErrors = {};

    if (!WEEKDAYS.includes(form.day)) {
      nextErrors.day = 'Please select a valid weekday.';
    }

    const selectedCourseRecord = courses.find(
      (course) => getRecordId(course) === form.courseId,
    );

    const selectedFacultyRecord = faculty.find(
      (member) => getRecordId(member) === form.facultyId,
    );

    const selectedBatchRecord = batches.find(
      (batch) => getRecordId(batch) === form.batchId,
    );

    const selectedSectionRecord = sections.find(
      (section) => getRecordId(section) === form.sectionId,
    );

    if (
      !OBJECT_ID_PATTERN.test(form.courseId) ||
      !selectedCourseRecord
    ) {
      nextErrors.courseId = 'Please select a valid active course.';
    }

    if (
      !OBJECT_ID_PATTERN.test(form.facultyId) ||
      !selectedFacultyRecord
    ) {
      nextErrors.facultyId = 'Please select valid active faculty.';
    }

    if (
      !OBJECT_ID_PATTERN.test(form.batchId) ||
      !selectedBatchRecord
    ) {
      nextErrors.batchId = 'Please select a valid active batch.';
    }

    if (
      !OBJECT_ID_PATTERN.test(form.sectionId) ||
      !selectedSectionRecord
    ) {
      nextErrors.sectionId = 'Please select a valid active section.';
    }

    if (
      selectedCourseRecord &&
      assignedBatchIds.length > 0 &&
      !assignedBatchIds.includes(form.batchId)
    ) {
      nextErrors.batchId =
        'The selected batch is not assigned to this course.';
    }

    if (
      selectedCourseRecord &&
      assignedSectionIds.length > 0 &&
      !assignedSectionIds.includes(form.sectionId)
    ) {
      nextErrors.sectionId =
        'The selected section is not assigned to this course.';
    }

    const sectionBatchId =
      selectedSectionRecord?.batchId ||
      getRecordId(selectedSectionRecord?.batch);

    if (
      selectedSectionRecord &&
      sectionBatchId &&
      sectionBatchId !== form.batchId
    ) {
      nextErrors.sectionId =
        'The selected section does not belong to the selected batch.';
    }

    if (!form.startTime) {
      nextErrors.startTime = 'Start time is required.';
    } else if (!TIME_PATTERN.test(form.startTime)) {
      nextErrors.startTime = 'Enter a valid start time.';
    }

    if (!form.endTime) {
      nextErrors.endTime = 'End time is required.';
    } else if (!TIME_PATTERN.test(form.endTime)) {
      nextErrors.endTime = 'Enter a valid end time.';
    }

    if (
      TIME_PATTERN.test(form.startTime) &&
      TIME_PATTERN.test(form.endTime) &&
      form.startTime >= form.endTime
    ) {
      nextErrors.endTime =
        'End time must be later than start time.';
    }

    const room = form.room.trim();

    if (!room) {
      nextErrors.room = 'Room information is required.';
    } else if (room.length > 100) {
      nextErrors.room = 'Room cannot exceed 100 characters.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function handleReloadDirectory() {
    if (loadingDirectory) {
      return;
    }

    setDirectoryReloadKey((current) => current + 1);
  }

  function handleReloadSections() {
    if (loadingSections || !form.batchId) {
      return;
    }

    setSectionReloadKey((current) => current + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || loadingDirectory || loadingSections) {
      return;
    }

    setFormError('');

    if (!validateForm()) {
      return;
    }

    if (directoryError) {
      setFormError(
        'Directory information could not be loaded. Reload it before saving.',
      );
      return;
    }

    if (sectionError) {
      setFormError(
        'Section information could not be loaded. Reload the selected batch sections before saving.',
      );
      return;
    }

    setSaving(true);

    try {
      await timetableService.createTimetable({
        day: form.day,
        courseId: form.courseId,
        facultyId: form.facultyId,
        batchId: form.batchId,
        sectionId: form.sectionId,
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room.trim(),
      });

      navigate('/hod/timetable', {
        replace: true,
        state: {
          timetableNotice: 'Timetable entry created successfully.',
        },
      });
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          'Unable to create the timetable entry.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="ACADEMIC OPERATIONS"
        title="Create Timetable"
        description="Create a department timetable entry using existing courses, faculty, batches, and sections."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Timetable', to: '/hod/timetable' },
          { label: 'Create Timetable' },
        ]}
        actions={
          <Link to="/hod/timetable">
            <ActionButton variant="secondary">
              Back to Timetable
            </ActionButton>
          </Link>
        }
      />

      {directoryError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
        >
          <p>{directoryError}</p>

          <button
            type="button"
            onClick={handleReloadDirectory}
            disabled={loadingDirectory}
            className="mt-2 font-medium underline underline-offset-4 disabled:opacity-50"
          >
            {loadingDirectory ? 'Refreshing...' : 'Reload directory'}
          </button>
        </div>
      )}

      <SectionCard
        eyebrow="SCHEDULE CONFIGURATION"
        title="Class Information"
        description="Choose the actual records assigned to your department. The server independently verifies department access and scheduling conflicts before saving."
      >
        {loadingDirectory ? (
          <div
            className="flex items-center gap-3 py-8 text-sm text-[#A5A6B0]"
            role="status"
            aria-live="polite"
          >
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-[#B9A4FF] border-t-transparent"
              aria-hidden="true"
            />
            Loading courses, faculty, and batches...
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SelectField
                id="day"
                label="Weekday"
                value={form.day}
                onChange={handleChange}
                options={WEEKDAYS.map((day) => ({
                  id: day,
                  name: day,
                }))}
                placeholder="Select a weekday"
                error={errors.day}
                getOptionLabel={(option) => option.name}
              />

              <SelectField
                id="courseId"
                label="Course"
                value={form.courseId}
                onChange={handleChange}
                options={courses}
                placeholder={
                  courses.length
                    ? 'Select a course'
                    : 'No active courses available'
                }
                error={errors.courseId}
                getOptionLabel={getCourseName}
                disabled={courses.length === 0}
              />

              <SelectField
                id="facultyId"
                label="Faculty"
                value={form.facultyId}
                onChange={handleChange}
                options={faculty}
                placeholder={
                  faculty.length
                    ? 'Select faculty'
                    : 'No active faculty available'
                }
                error={errors.facultyId}
                disabled={faculty.length === 0}
                getOptionLabel={(record) => {
                  const name = getRecordName(record);

                  return record.institutionalId
                    ? `${name} (${record.institutionalId})`
                    : name;
                }}
              />

              <SelectField
                id="batchId"
                label="Batch"
                value={form.batchId}
                onChange={handleChange}
                options={availableBatches}
                placeholder={
                  !batches.length
                    ? 'No active batches available'
                    : !availableBatches.length
                      ? 'No batches assigned to this course'
                      : 'Select a batch'
                }
                error={errors.batchId}
                disabled={availableBatches.length === 0}
                getOptionLabel={(batch) => {
                  const name = getRecordName(batch);

                  return batch.academicYear
                    ? `${name} (${batch.academicYear})`
                    : name;
                }}
              />

              <div>
                <SelectField
                  id="sectionId"
                  label="Section"
                  value={form.sectionId}
                  onChange={handleChange}
                  options={availableSections}
                  placeholder={
                    !form.batchId
                      ? 'Select a batch first'
                      : loadingSections
                        ? 'Loading sections...'
                        : !sections.length
                          ? 'No active sections available'
                          : !availableSections.length
                            ? 'No sections assigned to this course'
                            : 'Select a section'
                  }
                  error={errors.sectionId || sectionError}
                  disabled={
                    !form.batchId ||
                    loadingSections ||
                    availableSections.length === 0
                  }
                />

                {form.batchId && sectionError && (
                  <button
                    type="button"
                    onClick={handleReloadSections}
                    disabled={loadingSections}
                    className="mt-2 text-xs font-medium text-[#CDB5F7] underline underline-offset-4 disabled:opacity-50"
                  >
                    {loadingSections ? 'Reloading sections...' : 'Retry loading sections'}
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor="room"
                  className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                >
                  Room <span className="text-red-400">*</span>
                </label>

                <input
                  id="room"
                  name="room"
                  type="text"
                  value={form.room}
                  onChange={handleChange}
                  maxLength={100}
                  required
                  placeholder="e.g. Room 204"
                  aria-invalid={Boolean(errors.room)}
                  aria-describedby={errors.room ? 'room-error' : undefined}
                  className="w-full rounded-xl border border-[#383943] bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#B9A4FF] focus:ring-2 focus:ring-[#B9A4FF]/20"
                />

                {errors.room && (
                  <p
                    id="room-error"
                    role="alert"
                    className="mt-2 text-xs text-red-400"
                  >
                    {errors.room}
                  </p>
                )}
              </div>

              <TimeField
                id="startTime"
                label="Start Time"
                value={form.startTime}
                onChange={handleChange}
                error={errors.startTime}
              />

              <TimeField
                id="endTime"
                label="End Time"
                value={form.endTime}
                onChange={handleChange}
                error={errors.endTime}
              />
            </div>

            {formError && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
              >
                {formError}
              </div>
            )}

            <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
              <ActionButton
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => navigate('/hod/timetable')}
              >
                Cancel
              </ActionButton>

              <ActionButton
                type="submit"
                loading={saving}
                disabled={
                  saving ||
                  loadingDirectory ||
                  loadingSections ||
                  Boolean(directoryError)
                }
              >
                Save Timetable
              </ActionButton>
            </div>
          </form>
        )}
      </SectionCard>

      <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#D0D0D8]">
          Scheduling rules
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          End time must be later than start time. The backend validates
          department ownership, referenced records, faculty availability,
          classroom conflicts, and overlapping batch and section schedules
          before accepting the timetable.
        </p>
      </div>
    </div>
  );
}