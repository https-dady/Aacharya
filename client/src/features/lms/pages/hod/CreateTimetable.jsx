import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

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

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getRecordId(record) {
  if (!record) {
    return '';
  }

  if (typeof record === 'string') {
    return record;
  }

  return String(record._id ?? record.id ?? '');
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
    error?.response?.data?.message ||
    error?.message ||
    fallback
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

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled = false,
  required = true,
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

        {required && (
          <span className="ml-1 text-red-400">*</span>
        )}
      </label>

      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
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

  const loadDirectory = useCallback(async () => {
    setLoadingDirectory(true);
    setDirectoryError('');

    try {
      const [courseResponse, facultyResponse, batchResponse] =
        await Promise.all([
          api.get('/v1/courses/department', {
            params: {
              page: 1,
              limit: 100,
              status: 'ACTIVE',
            },
          }),

          api.get('/v1/provisioning/faculty', {
            params: {
              page: 1,
              limit: 100,
              status: 'ACTIVE',
            },
          }),

          api.get('/v1/provisioning/batches', {
            params: {
              page: 1,
              limit: 100,
              status: 'ACTIVE',
            },
          }),
        ]);

      const courseData = getResponseData(courseResponse);
      const facultyData = getResponseData(facultyResponse);
      const batchData = getResponseData(batchResponse);

      setCourses(
        getActiveRecords(courseData.courses),
      );

      setFaculty(
        getActiveRecords(facultyData.faculty),
      );

      setBatches(
        getActiveRecords(batchData.batches),
      );
    } catch (error) {
      setDirectoryError(
        getErrorMessage(
          error,
          'Unable to load courses, faculty, and batches.',
        ),
      );
    } finally {
      setLoadingDirectory(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  useEffect(() => {
    if (!form.batchId) {
      setSections([]);
      setSectionError('');
      setLoadingSections(false);
      return undefined;
    }

    const controller = new AbortController();

    async function loadSections() {
      setLoadingSections(true);
      setSectionError('');
      setSections([]);

      try {
        const response = await api.get(
          `/v1/provisioning/batches/${form.batchId}/sections`,
          {
            params: {
              page: 1,
              limit: 100,
              status: 'ACTIVE',
            },
            signal: controller.signal,
          },
        );

        const data = getResponseData(response);

        setSections(getActiveRecords(data.sections));
      } catch (error) {
        if (
          error?.code === 'ERR_CANCELED' ||
          controller.signal.aborted
        ) {
          return;
        }

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
    }

    loadSections();

    return () => {
      controller.abort();
    };
  }, [form.batchId]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (name === 'batchId') {
        next.sectionId = '';
      }

      return next;
    });

    setErrors((current) => ({
      ...current,
      [name]: '',
      ...(name === 'batchId' ? { sectionId: '' } : {}),
    }));

    setFormError('');
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.day) {
      nextErrors.day = 'Please select a weekday.';
    }

    if (!form.courseId) {
      nextErrors.courseId = 'Please select a course.';
    }

    if (!form.facultyId) {
      nextErrors.facultyId = 'Please select faculty.';
    }

    if (!form.batchId) {
      nextErrors.batchId = 'Please select a batch.';
    }

    if (!form.sectionId) {
      nextErrors.sectionId = 'Please select a section.';
    }

    if (!form.startTime) {
      nextErrors.startTime = 'Start time is required.';
    }

    if (!form.endTime) {
      nextErrors.endTime = 'End time is required.';
    }

    if (
      form.startTime &&
      form.endTime &&
      form.startTime >= form.endTime
    ) {
      nextErrors.endTime =
        'End time must be later than start time.';
    }

    const room = form.room.trim();

    if (!room) {
      nextErrors.room = 'Room information is required.';
    } else if (room.length > 100) {
      nextErrors.room =
        'Room cannot exceed 100 characters.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
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
        'Directory information could not be loaded. Refresh it before saving.',
      );
      return;
    }

    if (sectionError) {
      setFormError(
        'Section information could not be loaded. Select the batch again and retry.',
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
            onClick={loadDirectory}
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
        description="Choose the actual records assigned to your department. The server will verify department access and scheduling conflicts before saving."
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
                options={batches}
                placeholder={
                  batches.length
                    ? 'Select a batch'
                    : 'No active batches available'
                }
                error={errors.batchId}
                disabled={batches.length === 0}
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
                  options={sections}
                  placeholder={
                    !form.batchId
                      ? 'Select a batch first'
                      : loadingSections
                        ? 'Loading sections...'
                        : sections.length
                          ? 'Select a section'
                          : 'No active sections available'
                  }
                  error={errors.sectionId || sectionError}
                  disabled={
                    !form.batchId ||
                    loadingSections ||
                    sections.length === 0
                  }
                />

                {form.batchId && sectionError && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((current) => ({
                        ...current,
                        batchId: '',
                        sectionId: '',
                      }));

                      setTimeout(() => {
                        setForm((current) => ({
                          ...current,
                          batchId: form.batchId,
                        }));
                      }, 0);
                    }}
                    className="mt-2 text-xs font-medium text-[#CDB5F7] underline underline-offset-4"
                  >
                    Reload sections by reselecting batch
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
          End time must be later than start time. The backend is responsible
          for checking faculty, room, batch, section, course, and department
          constraints before saving the schedule.
        </p>
      </div>
    </div>
  );
}