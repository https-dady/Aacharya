import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function validateForm(form) {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = 'Course name is required.';
  } else if (form.name.trim().length > 150) {
    errors.name = 'Course name cannot exceed 150 characters.';
  }

  if (!form.code.trim()) {
    errors.code = 'Course code is required.';
  } else if (form.code.trim().length > 30) {
    errors.code = 'Course code cannot exceed 30 characters.';
  }

  if (
    form.credits.trim() &&
    (!Number.isFinite(Number(form.credits)) ||
      Number(form.credits) < 0)
  ) {
    errors.credits = 'Enter a valid, non-negative credit value.';
  }

  if (
    form.semester.trim() &&
    (!Number.isInteger(Number(form.semester)) ||
      Number(form.semester) < 1 ||
      Number(form.semester) > 12)
  ) {
    errors.semester = 'Semester must be a whole number from 1 to 12.';
  }

  return errors;
}

export default function EditCourse() {
  const location = useLocation();
  const navigate = useNavigate();

  const course = location.state?.course ?? null;

  const [form, setForm] = useState(() => ({
    name: course?.name || course?.courseName || '',
    code: course?.code || course?.courseCode || '',
    description: course?.description || '',
    credits:
      course?.credits !== undefined && course?.credits !== null
        ? String(course.credits)
        : '',
    semester:
      course?.semester !== undefined && course?.semester !== null
        ? String(course.semester)
        : '',
  }));

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
      'Validation successful. Course updates are not connected to the backend yet, so no changes have been saved.',
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Edit Course"
        description="Update the course information and review the changes before backend integration."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Courses', to: '/hod/courses' },
          { label: 'Edit Course' },
        ]}
        actions={
          <Link to="/hod/courses">
            <ActionButton variant="secondary">
              Back to Courses
            </ActionButton>
          </Link>
        }
      />

      {!course ? (
        <EmptyState
          title="Course record unavailable"
          description="No course record was provided to this page. Open a course from the directory before attempting to edit it."
          action={
            <Link to="/hod/courses">
              <ActionButton variant="secondary">
                Return to Course Directory
              </ActionButton>
            </Link>
          }
        />
      ) : (
        <>
          <SectionCard
            eyebrow="COURSE CONFIGURATION"
            title="Course Information"
            description="Update the available course fields."
          >
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField
                  label="Course Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter course name"
                  error={errors.name}
                  required
                />

                <FormField
                  label="Course Code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Enter course code"
                  error={errors.code}
                  required
                />

                <FormField
                  label="Credits"
                  name="credits"
                  type="number"
                  value={form.credits}
                  onChange={handleChange}
                  placeholder="Enter course credits"
                  error={errors.credits}
                  inputProps={{ min: 0, step: 0.5 }}
                />

                <FormField
                  label="Semester"
                  name="semester"
                  type="number"
                  value={form.semester}
                  onChange={handleChange}
                  placeholder="Enter semester number"
                  error={errors.semester}
                  inputProps={{ min: 1, max: 12, step: 1 }}
                />

                <div className="md:col-span-2">
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                  >
                    Course Description
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={5}
                    maxLength={2000}
                    placeholder="Describe the course and its academic scope..."
                    className="w-full resize-y rounded-xl border border-[#383943] bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition placeholder:text-[#777986] focus:border-[#B9A4FF] focus:ring-2 focus:ring-[#B9A4FF]/20"
                  />

                  <p className="mt-2 text-xs text-[#777986]">
                    {form.description.length}/2000 characters
                  </p>
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
                  onClick={() => navigate('/hod/courses')}
                >
                  Cancel
                </ActionButton>

                <ActionButton type="submit">
                  Validate Changes
                </ActionButton>
              </div>
            </form>
          </SectionCard>

          <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm font-medium text-[#D0D0D8]">
              Save status
            </p>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              This page validates the form locally. It does not modify
              the original course record or save changes to the database.
              Course update permissions and persistence will be connected
              according to the existing backend contracts.
            </p>
          </div>
        </>
      )}
    </div>
  );
}