import { useCallback, useEffect, useState } from 'react';

import useAuth from '../../../auth/context/useAuth.js';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import mentorProfileService from '../../services/mentorProfileService.js';

function getInitialForm(profile) {
  return {
    fullName: profile?.fullName ?? '',
    email: profile?.email ?? '',
  };
}

function ProfileField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  readOnly = false,
  required = false,
  disabled = false,
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
        {required && (
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        readOnly={readOnly}
        required={required}
        disabled={disabled}
        autoComplete={
          id === 'mentor-full-name'
            ? 'name'
            : id === 'mentor-email'
              ? 'email'
              : 'off'
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 read-only:cursor-not-allowed read-only:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:read-only:bg-slate-800"
      />
    </div>
  );
}

function getErrorMessage(error) {
  return error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Something went wrong. Please try again.';
}

export default function MentorProfile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProfile = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    try {
      const result = await mentorProfileService.getMyProfile({
        signal,
      });

      setProfile(result);
      setForm(getInitialForm(result));
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadProfile(controller.signal);

    return () => controller.abort();
  }, [loadProfile]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setNotice('');
    setError('');
  }

  function handleEdit() {
    setForm(getInitialForm(profile));
    setEditing(true);
    setNotice('');
    setError('');
  }

  function handleCancel() {
    setForm(getInitialForm(profile));
    setEditing(false);
    setNotice('');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!editing || saving) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const updatedProfile = await mentorProfileService.updateMyProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
      });

      setProfile(updatedProfile);
      setForm(getInitialForm(updatedProfile));
      setEditing(false);

      setNotice(
        updatedProfile.isEmailVerified
          ? 'Your profile has been updated successfully.'
          : 'Profile updated. Your new email address requires verification.',
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const displayName = profile?.fullName || user?.fullName || 'Mentor';

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="Manage your mentor account information."
        />

        <div
          className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
          role="status"
        >
          Loading your profile...
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="Manage your mentor account information."
        />

        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900 dark:bg-rose-950/30"
          role="alert"
        >
          <p className="text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>

          <button
            type="button"
            onClick={() => loadProfile()}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="View your mentor account information and update permitted personal details."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            aria-hidden="true"
          >
            {initials || 'M'}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-semibold text-slate-900 dark:text-white">
              {displayName}
            </h2>

            <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-400">
              {profile?.email || 'Email not available'}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
                Mentor
              </span>

              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {profile?.status || 'Status unavailable'}
              </span>
            </div>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={handleEdit}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Edit Profile
            </button>
          )}
        </div>
      </section>

      {error && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          role="status"
        >
          {notice}
        </div>
      )}

      <SectionCard
        title="Personal Information"
        description="Only your full name and email address can be edited here. Institutional and department information is managed by your institution."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ProfileField
              id="mentor-full-name"
              label="Full Name"
              value={form.fullName}
              onChange={(event) => handleChange({
                target: {
                  name: 'fullName',
                  value: event.target.value,
                },
              })}
              required
              disabled={!editing || saving}
            />

            <ProfileField
              id="mentor-email"
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(event) => handleChange({
                target: {
                  name: 'email',
                  value: event.target.value,
                },
              })}
              required
              disabled={!editing || saving}
            />

            <ProfileField
              id="mentor-institutional-id"
              label="Institutional ID"
              value={profile?.institutionalId}
              readOnly
            />

            <ProfileField
              id="mentor-department"
              label="Department"
              value={profile?.department?.name}
              readOnly
            />

            <ProfileField
              id="mentor-role"
              label="Account Role"
              value={profile?.role}
              readOnly
            />

            <ProfileField
              id="mentor-account-status"
              label="Account Status"
              value={profile?.status}
              readOnly
            />
          </div>

          {editing && (
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </SectionCard>

      <SectionCard
        title="Email Verification"
        description="Your registered email address is used for account communication and verification."
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {profile?.isEmailVerified
                ? 'Email verified'
                : 'Email verification pending'}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {profile?.isEmailVerified
                ? 'Your current email address is verified.'
                : 'Complete email verification using the account verification flow.'}
            </p>
          </div>

          <span
            className={[
              'rounded-full border px-3 py-1 text-xs font-medium',
              profile?.isEmailVerified
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
            ].join(' ')}
          >
            {profile?.isEmailVerified ? 'Verified' : 'Not verified'}
          </span>
        </div>
      </SectionCard>
    </div>
  );
}