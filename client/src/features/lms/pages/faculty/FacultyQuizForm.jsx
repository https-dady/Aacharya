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
  startDate: '',
  endDate: '',
  durationMinutes: '30',
  totalMarks: '',
  passingMarks: '',
  attemptsAllowed: '1',
  shuffleQuestions: false,
  shuffleOptions: false,
  showResultsAfterSubmission: false,
};

export default function FacultyQuizForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
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
      nextErrors.title = 'Quiz title is required.';
    } else if (form.title.trim().length > 120) {
      nextErrors.title = 'Quiz title cannot exceed 120 characters.';
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
      nextErrors.description = 'Quiz description is required.';
    }

    if (!form.instructions.trim()) {
      nextErrors.instructions = 'Student instructions are required.';
    }

    const start = form.startDate
      ? new Date(form.startDate).getTime()
      : NaN;

    const end = form.endDate
      ? new Date(form.endDate).getTime()
      : NaN;

    if (!form.startDate || !Number.isFinite(start)) {
      nextErrors.startDate = 'Enter a valid start date and time.';
    }

    if (!form.endDate || !Number.isFinite(end)) {
      nextErrors.endDate = 'Enter a valid end date and time.';
    } else if (Number.isFinite(start) && end <= start) {
      nextErrors.endDate = 'End time must be after start time.';
    }

    const duration = Number(form.durationMinutes);

    if (
      !form.durationMinutes ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 1440
    ) {
      nextErrors.durationMinutes =
        'Duration must be between 1 and 1,440 minutes.';
    }

    const totalMarks = Number(form.totalMarks);

    if (
      !form.totalMarks ||
      !Number.isFinite(totalMarks) ||
      totalMarks <= 0 ||
      totalMarks > 10000
    ) {
      nextErrors.totalMarks =
        'Total marks must be greater than 0 and at most 10,000.';
    }

    const passingMarks = Number(form.passingMarks);

    if (
      form.passingMarks === '' ||
      !Number.isFinite(passingMarks) ||
      passingMarks < 0 ||
      passingMarks > totalMarks
    ) {
      nextErrors.passingMarks =
        'Passing marks must be between 0 and total marks.';
    }

    const attempts = Number(form.attemptsAllowed);

    if (
      !Number.isInteger(attempts) ||
      attempts < 1 ||
      attempts > 100
    ) {
      nextErrors.attemptsAllowed =
        'Attempts must be between 1 and 100.';
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

    // Quiz persistence is intentionally not simulated.
    // Connect this form after confirming the backend contract.
    setNotice(
      'Validation successful. Quiz creation is not connected to the backend yet, so no quiz has been saved.',
    );
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setErrors({});
    setNotice('');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Create Quiz"
        description="Configure quiz information, assessment timing, scoring, and student access settings."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Quizzes',
            to: '/faculty/quizzes',
          },
          {
            label: 'Create Quiz',
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343640] bg-[#191A21] p-4">
        <div>
          <p className="text-sm font-semibold text-[#EAEAE6]">
            Quiz configuration
          </p>

          <p className="mt-1 text-sm text-[#9697A2]">
            Complete the required fields before proceeding to question setup.
          </p>
        </div>

        <Link
          to="/faculty/quizzes"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#D0D0D8] transition-colors hover:border-[#CDB5F7]/50 hover:text-[#EAEAE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          Back to Quizzes
        </Link>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">
          <SectionCard
            eyebrow="STEP 01"
            title="Quiz Information"
            description="Enter the quiz title and academic allocation."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <FormField
                name="title"
                label="Quiz Title"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter quiz title"
                required
                maxLength={120}
                error={errors.title}
              />

              <FormField
                name="courseName"
                label="Course Name"
                value={form.courseName}
                onChange={handleChange}
                placeholder="Enter assigned course"
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

              <div className="sm:col-span-2">
                <label
                  htmlFor="quiz-description"
                  className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                >
                  Description
                </label>

                <textarea
                  id="quiz-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  maxLength={3000}
                  required
                  aria-invalid={Boolean(errors.description)}
                  className="w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-3 text-sm leading-6 text-[#EAEAE6] outline-none transition-colors placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  placeholder="Describe the assessment and its learning objectives..."
                />

                {errors.description && (
                  <p role="alert" className="mt-2 text-sm text-[#D58B95]">
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="quiz-instructions"
                  className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                >
                  Student Instructions
                </label>

                <textarea
                  id="quiz-instructions"
                  name="instructions"
                  value={form.instructions}
                  onChange={handleChange}
                  rows={4}
                  maxLength={5000}
                  required
                  aria-invalid={Boolean(errors.instructions)}
                  className="w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-3 text-sm leading-6 text-[#EAEAE6] outline-none transition-colors placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  placeholder="Explain quiz rules, allowed resources, and submission expectations..."
                />

                {errors.instructions && (
                  <p role="alert" className="mt-2 text-sm text-[#D58B95]">
                    {errors.instructions}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 02"
            title="Schedule and Duration"
            description="Set when the quiz becomes available and how long students have."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <FormField
                name="startDate"
                label="Start Date and Time"
                type="datetime-local"
                value={form.startDate}
                onChange={handleChange}
                required
                error={errors.startDate}
              />

              <FormField
                name="endDate"
                label="End Date and Time"
                type="datetime-local"
                value={form.endDate}
                onChange={handleChange}
                required
                error={errors.endDate}
              />

              <FormField
                name="durationMinutes"
                label="Duration"
                type="number"
                value={form.durationMinutes}
                onChange={handleChange}
                min="1"
                max="1440"
                step="1"
                required
                error={errors.durationMinutes}
                helperText="Maximum duration: 24 hours."
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 03"
            title="Scoring Configuration"
            description="Configure maximum marks, passing criteria, and attempts."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <FormField
                name="totalMarks"
                label="Total Marks"
                type="number"
                value={form.totalMarks}
                onChange={handleChange}
                placeholder="e.g. 50"
                min="1"
                max="10000"
                step="1"
                required
                error={errors.totalMarks}
              />

              <FormField
                name="passingMarks"
                label="Passing Marks"
                type="number"
                value={form.passingMarks}
                onChange={handleChange}
                placeholder="e.g. 20"
                min="0"
                max={form.totalMarks || undefined}
                step="1"
                required
                error={errors.passingMarks}
              />

              <FormField
                name="attemptsAllowed"
                label="Allowed Attempts"
                type="number"
                value={form.attemptsAllowed}
                onChange={handleChange}
                min="1"
                max="100"
                step="1"
                required
                error={errors.attemptsAllowed}
                helperText="Number of attempts permitted per student."
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 04"
            title="Quiz Behaviour"
            description="Choose the intended quiz experience for students."
          >
            <div className="space-y-4 p-5 sm:p-6">
              {[
                {
                  name: 'shuffleQuestions',
                  label: 'Shuffle questions',
                  description:
                    'Randomize question order for each attempt.',
                },
                {
                  name: 'shuffleOptions',
                  label: 'Shuffle answer options',
                  description:
                    'Randomize answer-option order where supported.',
                },
                {
                  name: 'showResultsAfterSubmission',
                  label: 'Show results after submission',
                  description:
                    'Allow students to view their results after submitting.',
                },
              ].map((option) => (
                <label
                  key={option.name}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#343640] bg-[#191A21] p-4 transition-colors hover:border-[#555762]"
                >
                  <input
                    type="checkbox"
                    name={option.name}
                    checked={form[option.name]}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 accent-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  />

                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[#EAEAE6]">
                      {option.label}
                    </span>

                    <span className="mt-1 block text-sm leading-5 text-[#9697A2]">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
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
                to="/faculty/quizzes"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Cancel
              </Link>

              <ActionButton type="submit">
                Validate Quiz
              </ActionButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}