import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  name: '',
  email: '',
  studentId: '',
  batch: '',
  section: '',
  status: 'active',
};

const FORM_FIELDS = [
  {
    name: 'name',
    label: 'Full name',
    type: 'text',
    placeholder: 'Enter student full name',
    autoComplete: 'name',
    required: true,
  },
  {
    name: 'email',
    label: 'Email address',
    type: 'email',
    placeholder: 'student@example.com',
    autoComplete: 'email',
    required: true,
  },
  {
    name: 'studentId',
    label: 'Student ID / Enrollment number',
    type: 'text',
    placeholder: 'Enter student ID',
    autoComplete: 'off',
    required: true,
  },
  {
    name: 'batch',
    label: 'Assigned batch',
    type: 'text',
    placeholder: 'Select an assigned batch',
    autoComplete: 'off',
    required: true,
  },
  {
    name: 'section',
    label: 'Assigned section',
    type: 'text',
    placeholder: 'Select an assigned section',
    autoComplete: 'off',
    required: true,
  },
];

function FormField({
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete = 'off',
  required = false,
  disabled = false,
}) {
  const id = `mentor-student-${name}`;

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-[#D6D6DF]"
      >
        {label}
        {required && (
          <span className="ml-1 text-[#E5DF98]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        className={[
          'min-h-11 w-full rounded-xl border border-[#3B3C43]',
          'bg-[#14161C] px-3.5 py-2.5 text-sm text-[#EAEAE6]',
          'placeholder:text-[#686974] outline-none transition-colors',
          'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
        ].join(' ')}
      />
    </div>
  );
}

function StatusField({ value, onChange, disabled = false }) {
  return (
    <div className="min-w-0">
      <label
        htmlFor="mentor-student-status"
        className="mb-2 block text-sm font-medium text-[#D6D6DF]"
      >
        Account status
      </label>

      <select
        id="mentor-student-status"
        name="status"
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={[
          'min-h-11 w-full rounded-xl border border-[#3B3C43]',
          'bg-[#14161C] px-3.5 py-2.5 text-sm text-[#EAEAE6]',
          'outline-none transition-colors',
          'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
        ].join(' ')}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="rounded-xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-4">
      <p className="text-sm leading-6 text-[#B8B8C2]">{children}</p>
    </div>
  );
}

export default function MentorStudentForm() {
  const { studentId } = useParams();
  const isEditMode = Boolean(studentId);

  const [form, setForm] = useState(INITIAL_FORM);

  /*
   * Backend integration is intentionally not implemented here.
   *
   * Creating or editing a student requires:
   * - Confirmed mentor student API contracts.
   * - The authenticated mentor's assigned batches and sections.
   * - Server-side authorization and validation.
   * - A real existing student record for edit mode.
   */
  const student = null;
  const availableBatches = [];
  const availableSections = [];

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    // Submission is disabled until the real backend integration exists.
  }

  if (isEditMode && !student) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PageHeader
          eyebrow="Mentor workspace"
          title="Edit Student"
          description="Update permitted information for a student assigned to you."
          breadcrumbs={[
            { label: 'Mentor', to: '/mentor/dashboard' },
            { label: 'Assigned Students', to: '/mentor/students' },
            { label: 'Edit Student' },
          ]}
          actions={
            <Link
              to="/mentor/students"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              Back to students
            </Link>
          }
        />

        <SectionCard
          title="Student record unavailable"
          description="Editing requires loading the actual student record first."
        >
          <EmptyState
            title="Unable to load student information"
            description={`The student record "${studentId}" has not been loaded because the individual student API is not connected. No existing information will be overwritten.`}
            className="border-0 bg-transparent py-10"
            action={
              <Link
                to="/mentor/students"
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#191621] transition-colors hover:bg-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Return to assigned students
              </Link>
            }
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Mentor workspace"
        title="Create Student Account"
        description="Prepare a student account for a student belonging to your assigned batch and section."
        breadcrumbs={[
          { label: 'Mentor', to: '/mentor/dashboard' },
          { label: 'Assigned Students', to: '/mentor/students' },
          { label: 'Create Student' },
        ]}
        actions={
          <Link
            to="/mentor/students"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Cancel
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard
          eyebrow="Student information"
          title="Account details"
          description="Fields marked with an asterisk are required."
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {FORM_FIELDS.map((field) => (
                <FormField
                  key={field.name}
                  {...field}
                  value={form[field.name]}
                  onChange={handleChange}
                />
              ))}

              <StatusField
                value={form.status}
                onChange={handleChange}
              />
            </div>

            <Notice>
              Batch and section options are not available yet. The form must
              use the authenticated mentor's actual assignments before student
              creation can be enabled.
            </Notice>

            <div className="flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:justify-end">
              <Link
                to="/mentor/students"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#3B3C43] px-5 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled
                title="Student creation will be enabled after backend integration."
                className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-[#CDB5F7]/40 px-5 py-2.5 text-sm font-semibold text-[#191621]/70"
              >
                Create student account
              </button>
            </div>
          </form>
        </SectionCard>

        <aside className="space-y-4">
          <SectionCard
            title="Before creating an account"
            description="Mentor account-provisioning requirements."
          >
            <ul className="space-y-4">
              {[
                'The student must belong to a batch assigned to you.',
                'The section must be within your authorized mentoring scope.',
                'Student identity and enrollment details must be validated.',
                'The server must enforce permissions independently of the UI.',
              ].map((item, index) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#CDB5F7]/10 text-xs font-semibold text-[#CDB5F7]">
                    {index + 1}
                  </span>

                  <span className="text-sm leading-6 text-[#B8B8C2]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Account security"
            description="Student credentials must be handled securely."
          >
            <p className="text-sm leading-6 text-[#A5A6B0]">
              Password generation, credential delivery and account activation
              should be handled through the approved backend workflow. Never
              store plaintext passwords in this form.
            </p>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}