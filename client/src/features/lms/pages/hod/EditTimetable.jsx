import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
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

function createInitialForm(entry) {
  return {
    day: entry?.day || '',
    courseId: getRecordId(entry?.courseId || entry?.course),
    facultyId: getRecordId(entry?.facultyId || entry?.faculty),
    batchId: getRecordId(entry?.batchId || entry?.batch),
    sectionId: getRecordId(entry?.sectionId || entry?.section),
    startTime: entry?.startTime || '',
    endTime: entry?.endTime || '',
    room: entry?.room || '',
  };
}

export default function EditTimetable() {
  const location = useLocation();
  const navigate = useNavigate();

  // Support both the old route-state contract and the new overview.
  const entry =
    location.state?.timetableEntry ??
    location.state?.entry ??
    null;

  const [form, setForm] = useState(() => createInitialForm(entry));
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

  const timetableId = getRecordId(entry);

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

      setCourses(getActiveRecords(courseData.courses));
      setFaculty(getActiveRecords(facultyData.faculty));
      setBatches(getActiveRecords(batchData.batches));
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
    }

    loadSections();

    return () => {
      controller.abort();
    };
  }, [form.batchId]);

  useEffect(() => {
    if (!entry || !form.sectionId || sections.length === 0) {
      return;
    }

    const sectionExists = sections.some(
      (section) => getRecordId(section) === form.sectionId,
    );

    if (!sectionExists) {
      setSectionError(
        'The existing section is not in the active section list. Select the correct section before saving.',
      );
    }
  }, [entry, form.sectionId, sections]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'batchId' ? { sectionId: '' } : {}),
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
      ...(name === 'batchId' ? { sectionId: '' } : {}),
    }));

    if (name === 'batchId') {
      setSectionError('');
    }

    setFormError('');
  }

  function validateForm() {
    const nextErrors = {};

    if (!WEEKDAYS.includes(form.day)) {
      nextErrors.day = 'Please select a valid weekday.';
    }

    for (const field of [
      'courseId',
      'facultyId',
      'batchId',
      'sectionId',
    ]) {
      if (!/^[a-f\d]{24}$/i.test(form[field])) {
        nextErrors[field] = 'Please select a valid record.';
      }
    }

    if (!form.startTime) {
      nextErrors.startTime = 'Start time is required.';
    } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.startTime)) {
      nextErrors.startTime = 'Enter a valid start time.';
    }

    if (!form.endTime) {
      nextErrors.endTime = 'End time is required.';
    } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.endTime)) {
      nextErrors.endTime = 'Enter a valid end time.';
    }

    if (
      form.startTime &&
      form.endTime &&
      form.startTime >= form.endTime
    ) {
      nextErrors.endTime = 'End time must be later than start time.';
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

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || loadingDirectory || loadingSections) {
      return;
    }

    setFormError('');

    if (!entry || !timetableId) {
      setFormError(
        'The timetable entry ID is missing. Return to the timetable and select Edit again.',
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (directoryError || sectionError) {
      setFormError(
        'Resolve the directory or section loading error before saving.',
      );
      return;
    }

    setSaving(true);

    try {
      await timetableService.updateTimetable(timetableId, {
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
          timetableNotice: 'Timetable entry updated successfully.',
        },
      });
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          'Unable to update the timetable entry.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (!entry || !timetableId) {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        <PageHeader
          eyebrow="ACADEMIC OPERATIONS"
          title="Edit Timetable"
          description="Select an existing timetable entry to edit its schedule."
          breadcrumbs={[
            { label: 'HOD Dashboard', to: '/hod/dashboard' },
            { label: 'Timetable', to: '/hod/timetable' },
            { label: 'Edit Timetable' },
          ]}
        />

        <EmptyState
          title="Timetable entry unavailable"
          description="The timetable entry was not provided to this page. Return to the timetable and select Edit on an existing entry."
          action={
            <Link to="/hod/timetable">
              <ActionButton variant="secondary">
                Return to Timetable
              </ActionButton>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="ACADEMIC OPERATIONS"
        title="Edit Timetable"
        description="Update the course, faculty allocation, section, room, or timing for this class."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Timetable', to: '/hod/timetable' },
          { label: 'Edit Timetable' },
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
        description="Changes are validated by the backend before they are saved."
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
            Loading directory records...
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
                placeholder="Select a course"
                error={errors.courseId}
                disabled={!courses.length}
                getOptionLabel={getCourseName}
              />

              <SelectField
                id="facultyId"
                label="Faculty"
                value={form.facultyId}
                onChange={handleChange}
                options={faculty}
                placeholder="Select faculty"
                error={errors.facultyId}
                disabled={!faculty.length}
              />

              <SelectField
                id="batchId"
                label="Batch"
                value={form.batchId}
                onChange={handleChange}
                options={batches}
                placeholder="Select a batch"
                error={errors.batchId}
                disabled={!batches.length}
                getOptionLabel={(batch) => {
                  const name = getRecordName(batch);

                  return batch.academicYear
                    ? `${name} (${batch.academicYear})`
                    : name;
                }}
              />

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
                      : 'Select a section'
                }
                error={errors.sectionId || sectionError}
                disabled={
                  !form.batchId ||
                  loadingSections ||
                  !sections.length
                }
              />

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
                Save Changes
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
          The backend must validate department ownership, referenced
          records, and faculty, room, batch, and section scheduling
          conflicts before accepting an update.
        </p>
      </div>
    </div>
  );
}