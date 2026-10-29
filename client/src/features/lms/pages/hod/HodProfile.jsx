import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import useAuth from '../../../auth/context/useAuth.js';
import api from '../../../auth/services/api/axios.js';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#383943] bg-[#26272B]/60 p-4">
      <p className="text-xs font-medium text-[#92929F]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium leading-6 text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function getDisplayName(user) {
  return (
    user?.fullName?.trim()
    || user?.name?.trim()
    || 'HOD'
  );
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'HD';
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatRole(role) {
  if (typeof role !== 'string' || !role.trim()) {
    return 'Not available';
  }

  return role
    .trim()
    .toLowerCase()
    .split('_')
    .map(
      (part) => part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ');
}

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getDepartmentName(department) {
  if (typeof department === 'string') {
    return department || 'Not available';
  }

  return department?.name || 'Not available';
}

function getResponseData(response) {
  const body = response?.data;

  return body?.data ?? body ?? {};
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || fallback
  );
}

function ProfileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <circle
        cx="12"
        cy="8"
        r="3.75"
        stroke="currentColor"
        strokeWidth="1.6"
      />

      <path
        d="M4.5 20a7.5 7.5 0 0 1 15 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FieldLabel({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-medium text-[#C9C9D2]"
    >
      {children}
    </label>
  );
}

const INPUT_CLASS = [
  'min-h-11 w-full rounded-xl border border-[#454650]',
  'bg-[#191A20] px-3 py-2.5 text-sm text-[#EAEAE6]',
  'placeholder:text-[#777986]',
  'focus:border-[#CDB5F7] focus:outline-none',
  'focus:ring-2 focus:ring-[#CDB5F7]/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const BUTTON_CLASS = [
  'inline-flex min-h-10 items-center justify-center gap-2',
  'rounded-xl px-4 py-2 text-sm font-semibold',
  'transition-colors focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-[#CDB5F7]',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

export default function HodProfile() {
  const { user, setUser } = useAuth();

  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const response = await api.get('/v1/hod-profile/me');
      const data = getResponseData(response);
      const fetchedProfile = data.profile;

      if (!fetchedProfile) {
        throw new Error(
          'The server did not return HOD profile information.',
        );
      }

      setProfile(fetchedProfile);

      setForm({
        fullName: fetchedProfile.fullName || '',
        email: fetchedProfile.email || '',
      });

      setUser((currentUser) => ({
        ...currentUser,
        ...fetchedProfile,
      }));
    } catch (error) {
      setLoadError(
        getErrorMessage(
          error,
          'Unable to load your profile. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const fullName = getDisplayName(profile || user);
  const initials = getInitials(fullName);

  const emailVerified =
    (profile || user)?.isEmailVerified === true;

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setSaveError('');
    setSaveSuccess('');
  }

  function handleEdit() {
    setForm({
      fullName: profile?.fullName || '',
      email: profile?.email || '',
    });

    setSaveError('');
    setSaveSuccess('');
    setEditing(true);
  }

  function handleCancel() {
    setForm({
      fullName: profile?.fullName || '',
      email: profile?.email || '',
    });

    setSaveError('');
    setEditing(false);
  }

  async function handleSave(event) {
    event.preventDefault();

    setSaveError('');
    setSaveSuccess('');

    const fullNameValue = form.fullName.trim();
    const emailValue = form.email.trim().toLowerCase();

    if (fullNameValue.length < 2 || fullNameValue.length > 100) {
      setSaveError(
        'Full name must contain between 2 and 100 characters.',
      );

      return;
    }

    if (
      emailValue.length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)
    ) {
      setSaveError('Please enter a valid email address.');

      return;
    }

    const payload = {};

    if (fullNameValue !== (profile?.fullName || '')) {
      payload.fullName = fullNameValue;
    }

    if (emailValue !== (profile?.email || '')) {
      payload.email = emailValue;
    }

    if (Object.keys(payload).length === 0) {
      setSaveSuccess('No changes to save.');
      setEditing(false);

      return;
    }

    setSaving(true);

    try {
      const response = await api.patch(
        '/v1/hod-profile/me',
        payload,
      );

      const data = getResponseData(response);
      const updatedProfile = data.profile;

      if (!updatedProfile) {
        throw new Error(
          'The server did not return the updated profile.',
        );
      }

      setProfile(updatedProfile);

      setForm({
        fullName: updatedProfile.fullName || '',
        email: updatedProfile.email || '',
      });

      setUser((currentUser) => ({
        ...currentUser,
        ...updatedProfile,
      }));

      setEditing(false);

      setSaveSuccess(
        data.message || 'Your profile was updated successfully.',
      );
    } catch (error) {
      setSaveError(
        getErrorMessage(
          error,
          'Unable to save your profile. Please try again.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="My Profile"
        description="View your account information and manage your personal profile details."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'My Profile',
          },
        ]}
        actions={
          !editing && !loading ? (
            <button
              type="button"
              onClick={handleEdit}
              disabled={!profile}
              className={[
                BUTTON_CLASS,
                'border border-[#CDB5F7]/30',
                'bg-[#CDB5F7]/10 text-[#CDB5F7]',
                'hover:bg-[#CDB5F7]/15',
              ].join(' ')}
            >
              <ProfileIcon />
              Edit Profile
            </button>
          ) : null
        }
      />

      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 rounded-xl border border-[#383943] bg-[#1D1F27] p-5 text-sm text-[#A5A6B0]"
        >
          Loading your profile from the server...
        </div>
      )}

      {!loading && loadError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-[#B86D78]/40 bg-[#B86D78]/10 p-5"
        >
          <p className="text-sm font-semibold text-[#F0B0B9]">
            Unable to load profile
          </p>

          <p className="mt-2 text-sm leading-6 text-[#EAEAE6]">
            {loadError}
          </p>

          <button
            type="button"
            onClick={loadProfile}
            className={[
              BUTTON_CLASS,
              'mt-4 border border-[#454650]',
              'text-[#EAEAE6] hover:border-[#CDB5F7]',
            ].join(' ')}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && profile && (
        <>
          {saveSuccess && (
            <div
              role="status"
              className="mb-6 rounded-xl border border-[#5A8C78]/40 bg-[#5A8C78]/10 p-4"
            >
              <p className="text-sm leading-6 text-[#A6D8C1]">
                {saveSuccess}
              </p>
            </div>
          )}

          <section
            aria-label="Profile overview"
            className="mb-6 overflow-hidden rounded-2xl border border-[#343640] bg-[#1D1F27]"
          >
            <div className="h-1.5 bg-gradient-to-r from-[#CDB5F7] via-[#A997D9] to-[#E5DF98]" />

            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
              <div
                aria-label={`Profile initials: ${initials}`}
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-2xl font-semibold tracking-wide text-[#CDB5F7]"
              >
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#92929F]">
                  Account Profile
                </p>

                <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight text-[#EAEAE6]">
                  {fullName}
                </h2>

                <p className="mt-1 break-all text-sm text-[#A5A6B0]">
                  {profile.email || 'Email not available'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1 text-xs font-medium text-[#CDB5F7]">
                    {formatRole(profile.role)}
                  </span>

                  <StatusBadge
                    status={emailVerified ? 'active' : 'pending'}
                    label={emailVerified ? 'Email Verified' : 'Email Not Verified'}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </section>

          <SectionCard
            eyebrow="PERSONAL INFORMATION"
            title={editing ? 'Edit Profile' : 'Account Details'}
            description={
              editing
                ? 'Update your name or email address. Your institutional identity and department assignment cannot be changed here.'
                : 'Your account information is retrieved from the LMS backend.'
            }
          >
            {editing ? (
              <form
                onSubmit={handleSave}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="hod-full-name">
                      Full Name
                    </FieldLabel>

                    <input
                      id="hod-full-name"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      value={form.fullName}
                      onChange={handleFormChange}
                      disabled={saving}
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="hod-email">
                      Email Address
                    </FieldLabel>

                    <input
                      id="hod-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={form.email}
                      onChange={handleFormChange}
                      disabled={saving}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                {saveError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#B86D78]/40 bg-[#B86D78]/10 p-4"
                  >
                    <p className="text-sm leading-6 text-[#F0B0B9]">
                      {saveError}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className={[
                      BUTTON_CLASS,
                      'border border-[#454650]',
                      'text-[#C9C9D2] hover:border-[#777986]',
                    ].join(' ')}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className={[
                      BUTTON_CLASS,
                      'bg-[#CDB5F7] text-[#191720]',
                      'hover:bg-[#D8C7FA]',
                    ].join(' ')}
                  >
                    {saving ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailField
                  label="Full Name"
                  value={profile.fullName}
                />

                <DetailField
                  label="Institutional ID"
                  value={profile.institutionalId}
                />

                <DetailField
                  label="Email Address"
                  value={profile.email}
                />

                <DetailField
                  label="Account Role"
                  value={formatRole(profile.role)}
                />

                <DetailField
                  label="Department"
                  value={getDepartmentName(profile.department)}
                />

                <DetailField
                  label="Account Created"
                  value={formatDate(profile.createdAt)}
                />
              </div>
            )}
          </SectionCard>

          {!editing && (
            <div className="mt-6">
              <SectionCard
                eyebrow="ACCOUNT SECURITY"
                title="Email Verification"
                description="Verification status reported by your account."
              >
                <div className="flex flex-col gap-4 rounded-xl border border-[#383943] bg-[#26272B]/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#EAEAE6]">
                      Verification Status
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
                      {emailVerified
                        ? 'Your email address is currently marked as verified.'
                        : 'Your email address is not currently marked as verified.'}
                    </p>

                    {profile.emailVerifiedAt && emailVerified && (
                      <p className="mt-2 text-xs text-[#92929F]">
                        Verified on {formatDate(profile.emailVerifiedAt)}
                      </p>
                    )}
                  </div>

                  <StatusBadge
                    status={emailVerified ? 'active' : 'pending'}
                    label={emailVerified ? 'Verified' : 'Pending'}
                    size="sm"
                  />
                </div>

                {!emailVerified && (
                  <div
                    role="note"
                    className="mt-4 rounded-xl border border-[#E5DF98]/20 bg-[#E5DF98]/5 p-4"
                  >
                    <p className="text-sm font-medium text-[#E5DF98]">
                      Email verification may be required
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
                      If you changed your email address, its verification
                      status has been reset. Use the existing verification
                      flow where applicable.
                    </p>
                  </div>
                )}
              </SectionCard>
            </div>
          )}
        </>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#454650]/70 bg-[#1D1F27] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#EAEAE6]">
            Return to your workspace
          </p>

          <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
            Continue managing your department and academic operations.
          </p>
        </div>

        <Link
          to="/hod/dashboard"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}