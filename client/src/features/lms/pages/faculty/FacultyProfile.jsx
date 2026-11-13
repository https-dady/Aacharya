import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

import facultyProfileService from '../../services/facultyProfileService.js';

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

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return 'FA';
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatRole(role) {
  if (!role) return 'Not available';

  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value) {
  if (!value) return 'Not available';

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

function getErrorMessage(error) {
  return (
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.message
    || 'Something went wrong. Please try again.'
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

function ShieldCheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="M12 3.75 19 6.5v5.1c0 4.15-2.85 7.15-7 8.65-4.15-1.5-7-4.5-7-8.65V6.5l7-2.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FacultyProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await facultyProfileService.getMyProfile();

      setProfile(data);
      setForm({
        fullName: data.fullName || '',
        email: data.email || '',
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setSuccess('');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setSuccess('');

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();

    if (fullName.length < 2 || fullName.length > 100) {
      setError('Full name must contain between 2 and 100 characters.');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const payload = {};

    if (fullName !== (profile.fullName || '')) {
      payload.fullName = fullName;
    }

    if (email !== (profile.email || '')) {
      payload.email = email;
    }

    if (Object.keys(payload).length === 0) {
      setSuccess('Your profile is already up to date.');
      return;
    }

    setSaving(true);

    try {
      const updatedProfile =
        await facultyProfileService.updateMyProfile(payload);

      setProfile(updatedProfile);

      setForm({
        fullName: updatedProfile.fullName || '',
        email: updatedProfile.email || '',
      });

      setSuccess(
        'Profile updated successfully.'
        + (
          payload.email
            ? ' Your new email may require verification.'
            : ''
        ),
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const fullName = profile?.fullName || 'Faculty Member';
  const emailVerified = profile?.isEmailVerified === true;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="FACULTY WORKSPACE"
          title="My Profile"
          description="Loading your institutional account information."
        />

        <div
          role="status"
          className="mt-6 rounded-2xl border border-[#343640] bg-[#1D1F27] p-8 text-center text-sm text-[#A5A6B0]"
        >
          Loading faculty profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="FACULTY WORKSPACE"
          title="My Profile"
          description="Your institutional account information."
        />

        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-400/20 bg-red-400/5 p-5"
        >
          <p className="text-sm text-red-300">
            {error || 'Unable to load your faculty profile.'}
          </p>

          <button
            type="button"
            onClick={loadProfile}
            className="mt-4 rounded-lg border border-[#CDB5F7]/30 px-4 py-2 text-sm font-medium text-[#CDB5F7] hover:bg-[#CDB5F7]/10"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="My Profile"
        description="Manage your personal information and review your institutional account details."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'My Profile',
          },
        ]}
      />

      <section
        aria-label="Faculty profile overview"
        className="mb-6 mt-6 overflow-hidden rounded-2xl border border-[#343640] bg-[#1D1F27]"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#CDB5F7] via-[#A997D9] to-[#E5DF98]" />

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-2xl font-semibold text-[#CDB5F7]">
            {getInitials(fullName)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#92929F]">
              Faculty Account
            </p>

            <h2 className="mt-2 break-words text-2xl font-semibold text-[#EAEAE6]">
              {fullName}
            </h2>

            <p className="mt-1 break-all text-sm text-[#A5A6B0]">
              {profile.email || 'Email not available'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1 text-xs font-medium text-[#CDB5F7]">
                {formatRole(profile.role)}
              </span>

              <StatusBadge
                status={emailVerified ? 'active' : 'pending'}
                size="sm"
              />
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        eyebrow="PERSONAL INFORMATION"
        title="Edit Profile"
        description="Update the personal information associated with your faculty account."
        icon={<ProfileIcon />}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="faculty-full-name"
                className="mb-2 block text-sm font-medium text-[#EAEAE6]"
              >
                Full Name
              </label>

              <input
                id="faculty-full-name"
                name="fullName"
                type="text"
                value={form.fullName}
                onChange={handleChange}
                minLength={2}
                maxLength={100}
                required
                autoComplete="name"
                className="min-h-11 w-full rounded-xl border border-[#383943] bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
              />
            </div>

            <div>
              <label
                htmlFor="faculty-email"
                className="mb-2 block text-sm font-medium text-[#EAEAE6]"
              >
                Email Address
              </label>

              <input
                id="faculty-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                maxLength={254}
                required
                autoComplete="email"
                className="min-h-11 w-full rounded-xl border border-[#383943] bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-300"
            >
              {success}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-[#383943] pt-5">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setForm({
                  fullName: profile.fullName || '',
                  email: profile.email || '',
                });
                setError('');
                setSuccess('');
              }}
              className="rounded-xl border border-[#454650] px-5 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:border-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset Changes
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#CDB5F7] px-5 py-2.5 text-sm font-semibold text-[#17151E] transition hover:bg-[#DDCCFA] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        eyebrow="INSTITUTIONAL INFORMATION"
        title="Account Details"
        description="These details are managed by your institution and cannot be edited here."
        icon={<ShieldCheckIcon />}
        className="mt-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField
            label="Institutional ID"
            value={profile.institutionalId}
          />

          <DetailField
            label="Account Role"
            value={formatRole(profile.role)}
          />

          <DetailField
            label="Department"
            value={profile.department?.name}
          />

          <DetailField
            label="Department Code"
            value={profile.department?.code}
          />

          <DetailField
            label="Account Status"
            value={formatRole(profile.status)}
          />

          <DetailField
            label="Account Created"
            value={formatDate(profile.createdAt)}
          />
        </div>

        <div className="mt-5 rounded-xl border border-[#383943] bg-[#26272B]/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#EAEAE6]">
                Email Verification
              </p>

              <p className="mt-1 text-xs text-[#A5A6B0]">
                {emailVerified
                  ? 'Your email address is verified.'
                  : 'Your email address is not currently verified.'}
              </p>
            </div>

            <StatusBadge
              status={emailVerified ? 'active' : 'pending'}
              size="sm"
            />
          </div>
        </div>
      </SectionCard>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#454650]/70 bg-[#1D1F27] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#EAEAE6]">
            Return to your workspace
          </p>

          <p className="mt-1 text-xs text-[#A5A6B0]">
            Continue to your teaching and academic workspace.
          </p>
        </div>

        <Link
          to="/faculty/dashboard"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}