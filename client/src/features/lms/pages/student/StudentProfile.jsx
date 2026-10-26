import { useMemo, useState } from 'react';

import useAuth from '../../../auth/context/useAuth.js';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'ST';

  const parts = name.trim().split(/\s+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getText(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }

  return String(value);
}

function ProfileField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {getText(value)}
      </p>
    </div>
  );
}

function EditableField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-[#D1D1D8]"
      >
        {label}
        {required && (
          <span className="ml-1 text-rose-300" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={name === 'phone' ? 'tel' : 'off'}
        className={[
          'min-h-11 w-full rounded-xl border border-[#454650]',
          'bg-[#191A21] px-4 py-2.5 text-sm text-[#EAEAE6]',
          'placeholder:text-[#777884]',
          'focus:border-[#CDB5F7] focus:outline-none',
          'focus:ring-2 focus:ring-[#CDB5F7]/20',
        ].join(' ')}
      />
    </div>
  );
}

export default function StudentProfile() {
  const { user } = useAuth();

  const displayName =
    user?.fullName ||
    user?.name ||
    'Student';

  const email = user?.email || '';

  const academicDetails = useMemo(
    () => [
      {
        label: 'Role',
        value: user?.role,
      },
      {
        label: 'Department',
        value: user?.departmentName || user?.department?.name,
      },
      {
        label: 'Student ID',
        value: user?.studentId || user?.enrollmentNumber,
      },
      {
        label: 'Batch',
        value: user?.batchName || user?.batch?.name,
      },
      {
        label: 'Section',
        value: user?.sectionName || user?.section?.name,
      },
      {
        label: 'Semester',
        value: user?.semester,
      },
    ],
    [user],
  );

  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    fullName:
      typeof user?.fullName === 'string'
        ? user.fullName
        : typeof user?.name === 'string'
          ? user.name
          : '',
    phone:
      typeof user?.phone === 'string'
        ? user.phone
        : '',
  });

  const [notice, setNotice] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setNotice('');
  }

  function handleCancel() {
    setForm({
      fullName:
        typeof user?.fullName === 'string'
          ? user.fullName
          : typeof user?.name === 'string'
            ? user.name
            : '',
      phone:
        typeof user?.phone === 'string'
          ? user.phone
          : '',
    });

    setIsEditing(false);
    setNotice('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    // Profile-update API contract is not yet integrated.
    // Do not report success or pretend changes were persisted.
    setNotice(
      'Profile updates are not connected yet. Your changes have not been saved.',
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="My Profile"
        description="Review your personal information, academic details, and account information."
        breadcrumbs={[
          { label: 'Dashboard', to: '/student/dashboard' },
          { label: 'My Profile' },
        ]}
      />

      <section className="mb-6 overflow-hidden rounded-2xl border border-[#343640] bg-[#1D1F27]">
        <div className="h-28 bg-gradient-to-r from-[#302744] via-[#252431] to-[#1D1F27]" />

        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              <div
                className={[
                  'flex h-20 w-20 shrink-0 items-center justify-center',
                  'rounded-2xl border-4 border-[#1D1F27]',
                  'bg-[#CDB5F7] text-2xl font-bold text-[#20172D]',
                ].join(' ')}
                aria-label={`Initials: ${getInitials(displayName)}`}
              >
                {getInitials(displayName)}
              </div>

              <div className="min-w-0 pb-1">
                <h2 className="break-words text-xl font-semibold text-[#EAEAE6]">
                  {displayName}
                </h2>

                <p className="mt-1 break-words text-sm text-[#A5A6B0]">
                  {email || 'Email unavailable'}
                </p>

                <span className="mt-2 inline-flex rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-2.5 py-1 text-xs font-medium text-[#CDB5F7]">
                  {getText(user?.role)}
                </span>
              </div>
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  setNotice('');
                  setIsEditing(true);
                }}
                className={[
                  'inline-flex min-h-10 items-center justify-center',
                  'rounded-xl border border-[#454650] px-4 py-2',
                  'text-sm font-semibold text-[#CDB5F7]',
                  'transition-colors hover:border-[#CDB5F7]',
                  'hover:bg-[#CDB5F7]/10',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[#CDB5F7]',
                ].join(' ')}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </section>

      {isEditing && (
        <SectionCard
          eyebrow="PERSONAL INFORMATION"
          title="Edit Profile"
          description="Review your details. Saving changes requires the profile-update API to be integrated."
        >
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <EditableField
                label="Full Name"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />

              <div className="min-w-0">
                <label
                  htmlFor="profile-email"
                  className="mb-2 block text-sm font-medium text-[#D1D1D8]"
                >
                  Email Address
                </label>

                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  readOnly
                  className={[
                    'min-h-11 w-full rounded-xl border border-[#343640]',
                    'bg-[#252630] px-4 py-2.5 text-sm text-[#858590]',
                    'cursor-not-allowed',
                  ].join(' ')}
                />

                <p className="mt-2 text-xs text-[#858590]">
                  Email changes are managed through the account process.
                </p>
              </div>

              <EditableField
                label="Phone Number"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </div>

            {notice && (
              <p
                role="status"
                className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-200"
              >
                {notice}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3 border-t border-[#343640] pt-5">
              <button
                type="submit"
                className={[
                  'inline-flex min-h-11 items-center justify-center',
                  'rounded-xl bg-[#CDB5F7] px-5 py-2.5',
                  'text-sm font-semibold text-[#20172D]',
                  'transition-colors hover:bg-[#DDCCFA]',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[#CDB5F7]',
                ].join(' ')}
              >
                Save Changes
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className={[
                  'inline-flex min-h-11 items-center justify-center',
                  'rounded-xl border border-[#454650] px-5 py-2.5',
                  'text-sm font-semibold text-[#D1D1D8]',
                  'transition-colors hover:border-[#777884]',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[#CDB5F7]',
                ].join(' ')}
              >
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          eyebrow="ACCOUNT"
          title="Personal Information"
          description="Information associated with your authenticated account."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProfileField
              label="Full Name"
              value={displayName}
            />

            <ProfileField
              label="Email Address"
              value={email}
            />

            <ProfileField
              label="Phone Number"
              value={user?.phone}
            />

            <ProfileField
              label="Account Role"
              value={user?.role}
            />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="ACADEMICS"
          title="Academic Information"
          description="Your department and academic placement details."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {academicDetails.map((detail) => (
              <ProfileField
                key={detail.label}
                label={detail.label}
                value={detail.value}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="ACCOUNT SECURITY"
          title="Account Information"
          description="Your profile is displayed using the currently authenticated user context."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
              <p className="text-sm font-medium text-[#EAEAE6]">
                Authentication
              </p>

              <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
                Your account identity is supplied by the existing
                authentication context.
              </p>
            </div>

            <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
              <p className="text-sm font-medium text-[#EAEAE6]">
                Profile Updates
              </p>

              <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
                Editing is available as a local form preview. Changes
                cannot be persisted until an approved backend endpoint
                is integrated.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <EmptyState
          title="Need academic assistance?"
          description="Review your attendance or academic results to keep track of your progress."
          icon={
            <span aria-hidden="true" className="text-2xl">
              ↗
            </span>
          }
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="/student/attendance"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:border-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                View Attendance
              </a>

              <a
                href="/student/results"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:border-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                View Results
              </a>
            </div>
          }
        />
      </div>
    </div>
  );
}