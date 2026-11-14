import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import mentorDashboardService from '../../services/mentorDashboardService.js';
import mentorStudentDetailsService from '../../services/mentorStudentDetailsService.js';

const INITIAL_FORM = {
  fullName: '',
  institutionalId: '',
  email: '',
  password: '',
  sectionId: '',
};

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
  autoComplete = 'off',
  hint,
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
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        minLength={type === 'password' ? 8 : undefined}
        maxLength={type === 'password' ? 72 : undefined}
        className="min-h-11 w-full rounded-xl border border-[#3B3C43] bg-[#14161C] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none transition placeholder:text-[#686974] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 disabled:cursor-not-allowed disabled:opacity-50"
      />

      {hint && (
        <p className="mt-1.5 text-xs leading-5 text-[#858590]">
          {hint}
        </p>
      )}
    </div>
  );
}

function Notice({ children, variant = 'info' }) {
  const styles = {
    info: 'border-[#CDB5F7]/15 bg-[#CDB5F7]/[0.04] text-[#B8B8C2]',
    error: 'border-red-500/20 bg-red-500/10 text-red-300',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  };

  return (
    <div className={`rounded-xl border p-4 text-sm leading-6 ${styles[variant]}`}>
      {children}
    </div>
  );
}

export default function MentorStudentForm() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const isEditMode = Boolean(studentId);

  const [form, setForm] = useState(INITIAL_FORM);
  const [sections, setSections] = useState([]);
  const [batches, setBatches] = useState([]);
  const [student, setStudent] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadFormData() {
      setLoading(true);
      setError('');

      try {
        const dashboard = await mentorDashboardService.getDashboard({
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setSections(dashboard.assignments.sections);
        setBatches(dashboard.assignments.batches);

        if (isEditMode) {
          const details =
            await mentorStudentDetailsService.getStudentDetails(
              studentId,
              { signal: controller.signal },
            );

          if (controller.signal.aborted) return;

          setStudent(details.student);

          setForm((current) => ({
            ...current,
            fullName: details.student.fullName || '',
            institutionalId: details.student.institutionalId || '',
            email: details.student.email || '',
            sectionId: details.sections[0]?.id || '',
          }));
        } else {
          setForm((current) => ({
            ...current,
            sectionId: dashboard.assignments.sections[0]?.id || '',
          }));
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          err.name === 'CanceledError' ||
          err.name === 'AbortError'
        ) {
          return;
        }

        setError(
          err.response?.data?.error?.message ||
          err.message ||
          'Unable to load student form data.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadFormData();

    return () => controller.abort();
  }, [isEditMode, studentId]);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === form.sectionId) || null,
    [sections, form.sectionId],
  );

  const selectedBatch = useMemo(() => {
    if (!selectedSection?.batch?.id) return null;

    return batches.find(
      (batch) => batch.id === selectedSection.batch.id,
    ) || selectedSection.batch;
  }, [batches, selectedSection]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    if (!form.sectionId) {
      setError('Select an assigned section.');
      return;
    }

    if (!isEditMode && form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (isEditMode) {
        const response = await api.patch(
          `/v1/provisioning/sections/${encodeURIComponent(form.sectionId)}/students/${encodeURIComponent(studentId)}`,
          {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
          },
        );

        if (response.data?.success !== true) {
          throw new Error(
            response.data?.error?.message ||
            response.data?.message ||
            'Unable to update student.',
          );
        }

        setSuccess('Student information updated successfully.');

        navigate(`/mentor/students/${studentId}`, {
          replace: true,
        });

        return;
      }

      const response = await api.post(
        `/v1/provisioning/sections/${encodeURIComponent(form.sectionId)}/students`,
        {
          institutionalId: form.institutionalId.trim(),
          fullName: form.fullName.trim(),
          ...(form.email.trim()
            ? { email: form.email.trim() }
            : {}),
          password: form.password,
        },
      );

      if (response.data?.success !== true) {
        throw new Error(
          response.data?.error?.message ||
          response.data?.message ||
          'Unable to create student account.',
        );
      }

      const createdStudent = response.data?.data?.student;

      if (!createdStudent?.id) {
        throw new Error(
          'Student was created, but the server returned an invalid student record.',
        );
      }

      navigate(`/mentor/students/${createdStudent.id}`, {
        replace: true,
        state: {
          notice: 'Student account created. Account activation is required before sign-in.',
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Unable to save student information.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] py-16 text-center text-sm text-[#A5A6B0]">
        Loading student information...
      </div>
    );
  }

  if (isEditMode && !student && !error) {
    return (
      <SectionCard title="Student unavailable">
        <EmptyState
          title="Student record could not be loaded"
          description="The requested student record is not available in your assigned sections."
          action={
            <Link
              to="/mentor/students"
              className="rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#191621]"
            >
              Return to students
            </Link>
          }
        />
      </SectionCard>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="MENTOR WORKSPACE"
        title={isEditMode ? 'Edit Student' : 'Create Student Account'}
        description={
          isEditMode
            ? 'Update the permitted profile information of an assigned student.'
            : 'Create a student account within one of your assigned sections.'
        }
        breadcrumbs={[
          { label: 'Mentor', to: '/mentor/dashboard' },
          { label: 'Assigned Students', to: '/mentor/students' },
          { label: isEditMode ? 'Edit Student' : 'Create Student' },
        ]}
        actions={
          <Link
            to="/mentor/students"
            className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition hover:bg-[#26272B]"
          >
            Cancel
          </Link>
        }
      />

      {error && <Notice variant="error">{error}</Notice>}
      {success && <Notice variant="success">{success}</Notice>}

      {sections.length === 0 && (
        <Notice>
          No active sections are assigned to your account. Student
          creation is unavailable until your HOD assigns a section.
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard
          eyebrow="STUDENT INFORMATION"
          title="Account details"
          description="Complete the required student information."
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                label="Full name"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                disabled={saving}
                autoComplete="name"
              />

              <Field
                label="Institutional ID / Enrollment number"
                name="institutionalId"
                value={form.institutionalId}
                onChange={handleChange}
                required
                disabled={saving || isEditMode}
                hint={
                  isEditMode
                    ? 'Institutional ID cannot be changed here.'
                    : 'Must be unique within the institution.'
                }
              />

              <Field
                label="Email address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                disabled={saving}
                autoComplete="email"
              />

              {!isEditMode && (
                <Field
                  label="Initial password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  autoComplete="new-password"
                  hint="Minimum 8 characters. The backend stores only a password hash."
                />
              )}

              <div className="min-w-0">
                <label
                  htmlFor="mentor-student-section"
                  className="mb-2 block text-sm font-medium text-[#D6D6DF]"
                >
                  Assigned section
                  <span className="ml-1 text-[#E5DF98]">*</span>
                </label>

                <select
                  id="mentor-student-section"
                  name="sectionId"
                  value={form.sectionId}
                  onChange={handleChange}
                  required
                  disabled={saving || isEditMode || sections.length === 0}
                  className="min-h-11 w-full rounded-xl border border-[#3B3C43] bg-[#14161C] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select assigned section</option>

                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name || section.code}
                      {section.batch?.name
                        ? ` — ${section.batch.name}`
                        : ''}
                    </option>
                  ))}
                </select>

                {isEditMode && (
                  <p className="mt-1.5 text-xs text-[#858590]">
                    Section assignment cannot be changed from this form.
                  </p>
                )}
              </div>
            </div>

            {selectedBatch && (
              <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#858590]">
                  Selected batch
                </p>

                <p className="mt-2 font-medium text-[#EAEAE6]">
                  {selectedBatch.name}
                </p>

                <p className="mt-1 text-xs text-[#858590]">
                  {selectedBatch.code}
                  {selectedBatch.academicYear
                    ? ` · ${selectedBatch.academicYear}`
                    : ''}
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:justify-end">
              <Link
                to="/mentor/students"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#3B3C43] px-5 py-2.5 text-sm font-semibold text-[#EAEAE6] transition hover:bg-[#26272B]"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving || sections.length === 0}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#CDB5F7] px-5 py-2.5 text-sm font-semibold text-[#191621] transition hover:bg-[#DCCBFA] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
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
            title="Account provisioning"
            description="Important information about student accounts."
          >
            <ul className="space-y-3 text-sm leading-6 text-[#A5A6B0]">
              <li>
                Student department and batch are derived from the
                selected assigned section.
              </li>
              <li>
                The backend verifies Mentor ownership of the section.
              </li>
              <li>
                Student accounts require activation before sign-in.
              </li>
              <li>
                Passwords are sent to the backend over the authenticated
                API and hashed server-side.
              </li>
            </ul>
          </SectionCard>

          <SectionCard
            title="Assignment scope"
            description="Your authorized sections."
          >
            <p className="text-2xl font-semibold text-[#EAEAE6]">
              {sections.length}
            </p>

            <p className="mt-1 text-xs text-[#858590]">
              Active sections assigned to you.
            </p>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}