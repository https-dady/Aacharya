import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import mentorDashboardService from '../../services/mentorDashboardService.js';

import mentorStudentDetailsService from '../../services/mentorStudentDetailsService.js';

import mentorStudentManagementService from '../../services/mentorStudentManagementService.js';

const INITIAL_FORM = {
  fullName: '',
  email: '',
  institutionalId: '',
  sectionId: '',
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Something went wrong. Please try again.'
  );
}

function isCancelled(error, signal) {
  return (
    signal?.aborted
    || error?.name === 'AbortError'
    || error?.code === 'ERR_CANCELED'
  );
}

function generateTemporaryPassword() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error(
      'Secure password generation is unavailable in this browser.',
    );
  }

  const bytes = new Uint8Array(32);

  globalThis.crypto.getRandomValues(bytes);

  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function FormField({
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  autoComplete = 'off',
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
          <span
            className="ml-1 text-[#E5DF98]"
            aria-hidden="true"
          >
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
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        maxLength={type === 'email' ? 254 : 100}
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

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor="mentor-student-section"
        className="mb-2 block text-sm font-medium text-[#D6D6DF]"
      >
        {label}
        <span className="ml-1 text-[#E5DF98]">*</span>
      </label>

      <select
        id="mentor-student-section"
        value={value}
        onChange={onChange}
        disabled={disabled}
        required
        className={[
          'min-h-11 w-full rounded-xl border border-[#3B3C43]',
          'bg-[#14161C] px-3.5 py-2.5 text-sm text-[#EAEAE6]',
          'outline-none transition-colors',
          'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
        ].join(' ')}
      >
        <option value="">
          {placeholder}
        </option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Feedback({ error, success }) {
  if (!error && !success) {
    return null;
  }

  return (
    <div
      role={error ? 'alert' : 'status'}
      aria-live="polite"
      className={[
        'rounded-xl border px-4 py-3 text-sm leading-6',
        error
          ? 'border-rose-400/25 bg-rose-400/10 text-rose-300'
          : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
      ].join(' ')}
    >
      {error || success}
    </div>
  );
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-8"
    >
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-40 rounded bg-[#343640]" />
        <div className="h-10 w-full rounded bg-[#343640]" />
        <div className="h-10 w-full rounded bg-[#343640]" />
      </div>

      <span className="sr-only">
        Loading student information.
      </span>
    </div>
  );
}

export default function MentorStudentForm() {
  const { studentId } = useParams();

  const navigate = useNavigate();

  const isEditMode = Boolean(studentId);

  const [form, setForm] = useState(INITIAL_FORM);

  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [initialStudent, setInitialStudent] = useState(null);

  const loadFormData = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    try {
      const dashboard = await mentorDashboardService.getDashboard({
        signal,
      });

      if (signal.aborted) {
        return;
      }

      const assignedBatches = dashboard.assignments.batches;
      const assignedSections = dashboard.assignments.sections;

      setBatches(assignedBatches);
      setSections(assignedSections);

      if (isEditMode) {
        const studentDetails =
          await mentorStudentDetailsService.getStudentDetails(
            studentId,
            { signal },
          );

        if (signal.aborted) {
          return;
        }

        const student = studentDetails.student;

        setInitialStudent(student);

        setForm({
          fullName: student.fullName,
          email: student.email || '',
          institutionalId: student.institutionalId,
          sectionId: studentDetails.sections[0]?.id || '',
        });
      }
    } catch (requestError) {
      if (!isCancelled(requestError, signal)) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [isEditMode, studentId]);

  useEffect(() => {
    const controller = new AbortController();

    loadFormData(controller.signal);

    return () => controller.abort();
  }, [loadFormData]);

  const sectionOptions = useMemo(
    () => sections.map((section) => ({
      value: section.id,
      label: `${section.name} (${section.code}) — ${
        section.batch?.name || 'Assigned batch'
      }`,
    })),
    [sections],
  );

  const selectedSection = sections.find(
    (section) => section.id === form.sectionId,
  );

  const selectedBatch = selectedSection?.batch;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError('');
    setSuccess('');

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const institutionalId = form.institutionalId
      .trim()
      .toUpperCase();

    if (fullName.length < 2 || fullName.length > 100) {
      setError('Full name must contain between 2 and 100 characters.');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid student email address.');
      return;
    }

    if (
      !isEditMode
      && (
        institutionalId.length < 2
        || institutionalId.length > 50
      )
    ) {
      setError('Enter a valid institutional ID.');
      return;
    }

    if (!form.sectionId) {
      setError('Select one of your assigned sections.');
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode) {
        await mentorStudentManagementService.updateStudent(
          form.sectionId,
          studentId,
          {
            fullName,
            email,
          },
        );

        navigate(`/mentor/students/${encodeURIComponent(studentId)}`, {
          replace: true,
        });

        return;
      }

      const temporaryPassword = generateTemporaryPassword();

      const result =
        await mentorStudentManagementService.createStudent(
          form.sectionId,
          {
            institutionalId,
            fullName,
            email,
            password: temporaryPassword,
          },
        );

      setSuccess(
        result.message
        || 'Student account created successfully.',
      );

      navigate(
        `/mentor/students/${encodeURIComponent(result.student.id)}`,
        {
          replace: true,
        },
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PageHeader
          eyebrow="MENTOR WORKSPACE"
          title={isEditMode ? 'Edit Student' : 'Create Student'}
          description="Loading your authorized academic assignments."
        />

        <LoadingState />
      </div>
    );
  }

  if (error && !batches.length && !sections.length) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PageHeader
          eyebrow="MENTOR WORKSPACE"
          title={isEditMode ? 'Edit Student' : 'Create Student'}
          description="Student account management."
        />

        <SectionCard title="Unable to load student form">
          <Feedback error={error} />

          <button
            type="button"
            onClick={() => {
              const controller = new AbortController();
              loadFormData(controller.signal);
            }}
            className="mt-4 rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#191621]"
          >
            Try again
          </button>
        </SectionCard>
      </div>
    );
  }

  if (isEditMode && !initialStudent) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PageHeader
          eyebrow="MENTOR WORKSPACE"
          title="Edit Student"
          description="Update the permitted information of an assigned student."
        />

        <EmptyState
          title="Student record unavailable"
          description={error || 'The requested student could not be retrieved within your mentoring scope.'}
          action={
            <Link
              to="/mentor/students"
              className="rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#191621]"
            >
              Back to students
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="MENTOR WORKSPACE"
        title={isEditMode ? 'Edit Student' : 'Create Student Account'}
        description={
          isEditMode
            ? 'Update the permitted profile information of your assigned student.'
            : 'Create a student account within one of your assigned academic sections.'
        }
        breadcrumbs={[
          {
            label: 'Mentor',
            to: '/mentor/dashboard',
          },
          {
            label: 'Assigned Students',
            to: '/mentor/students',
          },
          {
            label: isEditMode ? 'Edit Student' : 'Create Student',
          },
        ]}
        actions={
          <Link
            to={
              isEditMode
                ? `/mentor/students/${encodeURIComponent(studentId)}`
                : '/mentor/students'
            }
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition hover:bg-[#303139]"
          >
            Cancel
          </Link>
        }
      />

      <Feedback
        error={error}
        success={success}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard
          eyebrow="STUDENT INFORMATION"
          title="Account details"
          description="Only information permitted by the Mentor student-management APIs can be changed."
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                name="fullName"
                label="Full name"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter student full name"
                required
                disabled={submitting}
                autoComplete="name"
              />

              <FormField
                name="email"
                label="Email address"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="student@example.com"
                required
                disabled={submitting}
                autoComplete="email"
              />

              {!isEditMode && (
                <FormField
                  name="institutionalId"
                  label="Student ID / Enrollment number"
                  value={form.institutionalId}
                  onChange={handleChange}
                  placeholder="Enter institutional ID"
                  required
                  disabled={submitting}
                />
              )}

              {isEditMode && (
                <FormField
                  name="institutionalId"
                  label="Institutional ID"
                  value={form.institutionalId}
                  onChange={() => {}}
                  disabled
                />
              )}

              <SelectField
                label="Assigned section"
                value={form.sectionId}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    sectionId: event.target.value,
                  }));
                }}
                options={sectionOptions}
                disabled={submitting || isEditMode}
                placeholder="Select an assigned section"
              />
            </div>

            {selectedBatch && (
              <div className="rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/[0.05] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#CDB5F7]">
                  Selected academic batch
                </p>

                <p className="mt-2 font-semibold text-[#EAEAE6]">
                  {selectedBatch.name}
                </p>

                <p className="mt-1 text-sm text-[#A5A6B0]">
                  {selectedBatch.code}
                  {' · '}
                  {selectedBatch.academicYear}
                </p>
              </div>
            )}

            {!isEditMode && (
              <div className="rounded-xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-4">
                <h3 className="text-sm font-semibold text-[#E5DF98]">
                  Account activation
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
                  A secure temporary credential will be generated
                  automatically. The student must activate the account
                  through the institutional email workflow and set
                  their own password.
                </p>
              </div>
            )}

            {isEditMode && (
              <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
                <p className="text-sm font-semibold text-[#EAEAE6]">
                  Restricted account fields
                </p>

                <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
                  Institutional ID, department, batch assignment,
                  section assignment, role and password cannot be
                  changed through this profile form.
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:justify-end">
              <Link
                to={
                  isEditMode
                    ? `/mentor/students/${encodeURIComponent(studentId)}`
                    : '/mentor/students'
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#3B3C43] px-5 py-2.5 text-sm font-semibold text-[#EAEAE6] transition hover:bg-[#26272B]"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={submitting || sections.length === 0}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#CDB5F7] px-5 py-2.5 text-sm font-semibold text-[#191621] transition hover:bg-[#DCCBFA] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'Saving...'
                  : isEditMode
                    ? 'Save Changes'
                    : 'Create Student Account'}
              </button>
            </div>
          </form>
        </SectionCard>

        <aside className="space-y-4">
          <SectionCard
            title="Mentor permissions"
            description="Account operations are restricted to your assigned sections."
          >
            <ul className="space-y-4">
              {[
                'Only your active assigned sections are selectable.',
                'Student creation is validated by the backend.',
                'Institutional IDs must be unique.',
                'Students must activate their accounts before signing in.',
                'Existing account assignments cannot be modified here.',
              ].map((item, index) => (
                <li
                  key={item}
                  className="flex items-start gap-3"
                >
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
            title="Assigned academic scope"
            description="Your current authorized assignments."
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
                <p className="text-xs text-[#858590]">
                  Assigned batches
                </p>

                <p className="mt-2 text-2xl font-bold text-[#EAEAE6]">
                  {batches.length}
                </p>
              </div>

              <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
                <p className="text-xs text-[#858590]">
                  Assigned sections
                </p>

                <p className="mt-2 text-2xl font-bold text-[#EAEAE6]">
                  {sections.length}
                </p>
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}