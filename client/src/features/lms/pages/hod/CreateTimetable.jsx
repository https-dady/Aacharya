import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  day: '',
  courseName: '',
  courseCode: '',
  facultyName: '',
  sectionName: '',
  startTime: '',
  endTime: '',
  room: '',
};

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function validateForm(form) {
  const errors = {};

  const requiredFields = [
    ['day', 'Please select a weekday.'],
    ['courseName', 'Course name is required.'],
    ['courseCode', 'Course code is required.'],
    ['facultyName', 'Faculty name is required.'],
    ['sectionName', 'Section name is required.'],
    ['startTime', 'Start time is required.'],
    ['endTime', 'End time is required.'],
    ['room', 'Room information is required.'],
  ];

  requiredFields.forEach(([field, message]) => {
    if (!form[field].trim()) {
      errors[field] = message;
    }
  });

  if (
    form.startTime &&
    form.endTime &&
    form.startTime >= form.endTime
  ) {
    errors.endTime = 'End time must be later than start time.';
  }

  return errors;
}

export default function CreateTimetable() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));

    setNotice('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setNotice('');
      return;
    }

    setNotice(
      'Validation successful. Timetable creation is not connected to the backend yet, so no schedule has been saved.',
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="ACADEMIC OPERATIONS"
        title="Create Timetable"
        description="Prepare a class schedule by entering its academic and scheduling details."
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

      <SectionCard
        eyebrow="SCHEDULE CONFIGURATION"
        title="Class Information"
        description="Enter the details for the proposed timetable entry."
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="day"
                className="mb-2 block text-sm font-medium text-[#D0D0D8]"
              >
                Weekday <span className="text-red-400">*</span>
              </label>

              <select
                id="day"
                name="day"
                value={form.day}
                onChange={handleChange}
                aria-invalid={Boolean(errors.day)}
                aria-describedby={errors.day ? 'day-error' : undefined}
                className="w-full rounded-xl border border-[#383943] bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#B9A4FF] focus:ring-2 focus:ring-[#B9A4FF]/20"
              >
                <option value="">Select a weekday</option>

                {WEEKDAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>

              {errors.day && (
                <p
                  id="day-error"
                  role="alert"
                  className="mt-2 text-xs text-red-400"
                >
                  {errors.day}
                </p>
              )}
            </div>

            <FormField
              label="Course Name"
              name="courseName"
              value={form.courseName}
              onChange={handleChange}
              placeholder="Enter course name"
              error={errors.courseName}
              required
            />

            <FormField
              label="Course Code"
              name="courseCode"
              value={form.courseCode}
              onChange={handleChange}
              placeholder="Enter course code"
              error={errors.courseCode}
              required
            />

            <FormField
              label="Faculty Name"
              name="facultyName"
              value={form.facultyName}
              onChange={handleChange}
              placeholder="Enter faculty name"
              error={errors.facultyName}
              required
            />

            <FormField
              label="Section Name"
              name="sectionName"
              value={form.sectionName}
              onChange={handleChange}
              placeholder="Enter section name"
              error={errors.sectionName}
              required
            />

            <FormField
              label="Room"
              name="room"
              value={form.room}
              onChange={handleChange}
              placeholder="e.g. Room 204"
              error={errors.room}
              required
            />

            <div>
              <label
                htmlFor="startTime"
                className="mb-2 block text-sm font-medium text-[#D0D0D8]"
              >
                Start Time <span className="text-red-400">*</span>
              </label>

              <input
                id="startTime"
                name="startTime"
                type="time"
                value={form.startTime}
                onChange={handleChange}
                aria-invalid={Boolean(errors.startTime)}
                aria-describedby={
                  errors.startTime ? 'startTime-error' : undefined
                }
                className="w-full rounded-xl border border-[#383943] bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#B9A4FF] focus:ring-2 focus:ring-[#B9A4FF]/20"
              />

              {errors.startTime && (
                <p
                  id="startTime-error"
                  role="alert"
                  className="mt-2 text-xs text-red-400"
                >
                  {errors.startTime}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="endTime"
                className="mb-2 block text-sm font-medium text-[#D0D0D8]"
              >
                End Time <span className="text-red-400">*</span>
              </label>

              <input
                id="endTime"
                name="endTime"
                type="time"
                value={form.endTime}
                onChange={handleChange}
                aria-invalid={Boolean(errors.endTime)}
                aria-describedby={
                  errors.endTime ? 'endTime-error' : undefined
                }
                className="w-full rounded-xl border border-[#383943] bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#B9A4FF] focus:ring-2 focus:ring-[#B9A4FF]/20"
              />

              {errors.endTime && (
                <p
                  id="endTime-error"
                  role="alert"
                  className="mt-2 text-xs text-red-400"
                >
                  {errors.endTime}
                </p>
              )}
            </div>
          </div>

          {notice && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"
            >
              {notice}
            </div>
          )}

          <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => navigate('/hod/timetable')}
            >
              Cancel
            </ActionButton>

            <ActionButton type="submit">
              Validate Schedule
            </ActionButton>
          </div>
        </form>
      </SectionCard>

      <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#D0D0D8]">
          Scheduling note
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          This form validates required fields and the time range locally.
          Faculty availability, room conflicts, course-section
          compatibility, and database persistence are not yet implemented.
        </p>
      </div>
    </div>
  );
}