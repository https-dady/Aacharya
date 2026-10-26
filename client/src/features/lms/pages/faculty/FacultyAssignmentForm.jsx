import { useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  title: '',
  courseName: '',
  courseCode: '',
  sectionName: '',
  description: '',
  instructions: '',
  dueDate: '',
  totalMarks: '',
  allowedFileTypes: 'pdf, doc, docx',
  maxFileSizeMb: '10',
};

export default function FacultyAssignmentForm() {
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

  function validateForm() {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = 'Assignment title is required.';
    } else if (form.title.trim().length > 120) {
      nextErrors.title = 'Title cannot exceed 120 characters.';
    }

    if (!form.courseName.trim()) {
      nextErrors.courseName = 'Course name is required.';
    }

    if (!form.courseCode.trim()) {
      nextErrors.courseCode = 'Course code is required.';
    }

    if (!form.sectionName.trim()) {
      nextErrors.sectionName = 'Section or batch is required.';
    }

    if (!form.description.trim()) {
      nextErrors.description = 'Assignment description is required.';
    }

    if (!form.instructions.trim()) {
      nextErrors.instructions = 'Student instructions are required.';
    }

    if (!form.dueDate) {
      nextErrors.dueDate = 'Submission deadline is required.';
    } else {
      const deadline = new Date(form.dueDate);

      if (Number.isNaN(deadline.getTime())) {
        nextErrors.dueDate = 'Enter a valid deadline.';
      }
    }

    if (!form.totalMarks.trim()) {
      nextErrors.totalMarks = 'Total marks are required.';
    } else {
      const marks = Number(form.totalMarks);

      if (!Number.isFinite(marks) || marks <= 0 || marks > 10000) {
        nextErrors.totalMarks =
          'Enter a number between 1 and 10,000.';
      }
    }

    if (!form.allowedFileTypes.trim()) {
      nextErrors.allowedFileTypes =
        'Specify at least one allowed file type.';
    }

    if (!form.maxFileSizeMb.trim()) {
      nextErrors.maxFileSizeMb = 'Maximum file size is required.';
    } else {
      const size = Number(form.maxFileSizeMb);

      if (!Number.isFinite(size) || size <= 0 || size > 100) {
        nextErrors.maxFileSizeMb =
          'Enter a size greater than 0 and at most 100 MB.';
      }
    }

    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm();

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setNotice('');
      return;
    }

    // Intentionally do not pretend to save an assignment.
    // Connect this form to the confirmed backend contract later.
    setNotice(
      'The form is valid, but assignment creation is not connected yet. No assignment has been saved.',
    );
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setErrors({});
    setNotice('');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Create Assignment"
        description="Prepare coursework instructions, configure the deadline, and define submission requirements."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Assignments',
            to: '/faculty/assignments',
          },
          {
            label: 'Create Assignment',
          },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343640] bg-[#191A21] p-4">
        <div>
          <p className="text-sm font-semibold text-[#EAEAE6]">
            Assignment setup
          </p>

          <p className="mt-1 text-sm leading-5 text-[#9697A2]">
            Complete each required field before proceeding.
          </p>
        </div>

        <Link
          to="/faculty/assignments"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#D0D0D8] transition-colors hover:border-[#CDB5F7]/50 hover:text-[#EAEAE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          Back to Assignments
        </Link>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">
          <SectionCard
            eyebrow="STEP 01"
            title="Assignment Information"
            description="Enter the assignment title and academic details."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <FormField
                name="title"
                label="Assignment Title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Data Structures — Linked Lists"
                required
                maxLength={120}
                error={errors.title}
                helperText="Use a concise title students can easily identify."
              />

              <FormField
                name="courseName"
                label="Course Name"
                value={form.courseName}
                onChange={handleChange}
                placeholder="Enter course name"
                required
                error={errors.courseName}
              />

              <FormField
                name="courseCode"
                label="Course Code"
                value={form.courseCode}
                onChange={handleChange}
                placeholder="Enter course code"
                required
                error={errors.courseCode}
              />

              <FormField
                name="sectionName"
                label="Section / Batch"
                value={form.sectionName}
                onChange={handleChange}
                placeholder="Enter assigned section or batch"
                required
                error={errors.sectionName}
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 02"
            title="Description and Instructions"
            description="Explain the assignment and tell students how to complete it."
          >
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="assignment-description"
                  className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                >
                  Assignment Description
                  <span className="ml-1 text-[#E5DF98]" aria-hidden="true">
                    *
                  </span>
                  <span className="sr-only"> (required)</span>
                </label>

                <textarea
                  id="assignment-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={5000}
                  required
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={
                    errors.description
                      ? 'assignment-description-error'
                      : 'assignment-description-help'
                  }
                  placeholder="Describe the problem, learning objectives, and expected outcome..."
                  className={[
                    'w-full rounded-xl border bg-[#1D1F27] px-3.5 py-3',
                    'text-sm leading-6 text-[#EAEAE6]',
                    'placeholder:text-[#858590]',
                    'outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-[#CDB5F7]',
                    errors.description
                      ? 'border-[#D58B95]'
                      : 'border-[#454650] hover:border-[#62636E]',
                  ].join(' ')}
                />

                {errors.description ? (
                  <p
                    id="assignment-description-error"
                    role="alert"
                    className="mt-2 text-sm text-[#D58B95]"
                  >
                    {errors.description}
                  </p>
                ) : (
                  <p
                    id="assignment-description-help"
                    className="mt-2 text-xs text-[#9697A2]"
                  >
                    Maximum 5,000 characters.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="assignment-instructions"
                  className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                >
                  Student Instructions
                  <span className="ml-1 text-[#E5DF98]" aria-hidden="true">
                    *
                  </span>
                  <span className="sr-only"> (required)</span>
                </label>

                <textarea
                  id="assignment-instructions"
                  name="instructions"
                  value={form.instructions}
                  onChange={handleChange}
                  rows={5}
                  maxLength={10000}
                  required
                  aria-invalid={Boolean(errors.instructions)}
                  aria-describedby={
                    errors.instructions
                      ? 'assignment-instructions-error'
                      : 'assignment-instructions-help'
                  }
                  placeholder="Explain the submission process, formatting requirements, and evaluation criteria..."
                  className={[
                    'w-full rounded-xl border bg-[#1D1F27] px-3.5 py-3',
                    'text-sm leading-6 text-[#EAEAE6]',
                    'placeholder:text-[#858590]',
                    'outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-[#CDB5F7]',
                    errors.instructions
                      ? 'border-[#D58B95]'
                      : 'border-[#454650] hover:border-[#62636E]',
                  ].join(' ')}
                />

                {errors.instructions ? (
                  <p
                    id="assignment-instructions-error"
                    role="alert"
                    className="mt-2 text-sm text-[#D58B95]"
                  >
                    {errors.instructions}
                  </p>
                ) : (
                  <p
                    id="assignment-instructions-help"
                    className="mt-2 text-xs text-[#9697A2]"
                  >
                    Maximum 10,000 characters.
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 03"
            title="Deadline and Evaluation"
            description="Define the submission deadline and maximum marks."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <FormField
                name="dueDate"
                label="Submission Deadline"
                type="datetime-local"
                value={form.dueDate}
                onChange={handleChange}
                required
                error={errors.dueDate}
                helperText="The deadline will be interpreted using the institution's configured timezone when backend integration is added."
              />

              <FormField
                name="totalMarks"
                label="Maximum Marks"
                type="number"
                value={form.totalMarks}
                onChange={handleChange}
                placeholder="e.g. 100"
                min="1"
                max="10000"
                step="1"
                required
                error={errors.totalMarks}
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 04"
            title="Submission Requirements"
            description="Specify accepted document formats and the maximum file size."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <FormField
                name="allowedFileTypes"
                label="Allowed File Extensions"
                value={form.allowedFileTypes}
                onChange={handleChange}
                placeholder="pdf, doc, docx"
                required
                error={errors.allowedFileTypes}
                helperText="Separate file extensions with commas."
              />

              <FormField
                name="maxFileSizeMb"
                label="Maximum File Size"
                type="number"
                value={form.maxFileSizeMb}
                onChange={handleChange}
                placeholder="10"
                min="1"
                max="100"
                step="1"
                endAdornment="MB"
                required
                error={errors.maxFileSizeMb}
              />
            </div>

            <div className="mx-5 mb-5 rounded-xl border border-[#454650] bg-[#191A21] p-4 sm:mx-6 sm:mb-6">
              <p className="text-sm font-medium text-[#D0D0D8]">
                File upload integration
              </p>

              <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                These fields configure the intended submission requirements.
                Actual file validation and upload handling must also be
                enforced by the backend.
              </p>
            </div>
          </SectionCard>

          {notice && (
            <div
              role="status"
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"
            >
              {notice}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleReset}
            >
              Reset Form
            </ActionButton>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Link
                to="/faculty/assignments"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Cancel
              </Link>

              <ActionButton type="submit">
                Validate Assignment
              </ActionButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}