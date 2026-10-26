import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import useAuth from '../../../auth/context/useAuth.js';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const EMPTY_PROFILE = {
  name: '',
  email: '',
  phone: '',
  employeeId: '',
  department: '',
  designation: '',
  bio: '',
};

function getInitialProfile(user) {
  return {
    ...EMPTY_PROFILE,
    name: user?.name || user?.fullName || user?.firstName || '',
    email: user?.email || '',
    phone: user?.phone || user?.mobile || '',
    employeeId: user?.employeeId || '',
    department:
      typeof user?.department === 'object'
        ? user.department?.name || ''
        : user?.department || '',
    designation: user?.designation || user?.title || '',
    bio: user?.bio || '',
  };
}

const PROFILE_FIELDS = [
  {
    name: 'name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'Enter your full name',
    required: true,
  },
  {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'Your registered email address',
    readOnly: true,
  },
  {
    name: 'phone',
    label: 'Phone Number',
    type: 'tel',
    placeholder: 'Enter your phone number',
  },
  {
    name: 'employeeId',
    label: 'Employee ID',
    type: 'text',
    placeholder: 'Your employee identification',
    readOnly: true,
  },
  {
    name: 'department',
    label: 'Department',
    type: 'text',
    placeholder: 'Your assigned department',
    readOnly: true,
  },
  {
    name: 'designation',
    label: 'Designation',
    type: 'text',
    placeholder: 'Your professional designation',
    readOnly: true,
  },
];

function ProfileField({ field, value, onChange, disabled }) {
  const inputId = `mentor-profile-${field.name}`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {field.label}

        {field.required && (
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        id={inputId}
        name={field.name}
        type={field.type}
        value={value}
        onChange={onChange}
        required={field.required}
        readOnly={field.readOnly}
        disabled={disabled}
        placeholder={field.placeholder}
        autoComplete={
          field.name === 'name'
            ? 'name'
            : field.name === 'email'
              ? 'email'
              : field.name === 'phone'
                ? 'tel'
                : 'off'
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 read-only:cursor-not-allowed read-only:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:read-only:bg-slate-800"
      />
    </div>
  );
}

export default function MentorProfile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(() =>
    getInitialProfile(user),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setProfile(getInitialProfile(user));
  }, [user]);

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    setNotice('');
  }

  function handleEdit() {
    setProfile(getInitialProfile(user));
    setNotice('');
    setIsEditing(true);
  }

  function handleCancel() {
    setProfile(getInitialProfile(user));
    setNotice('');
    setIsEditing(false);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!isEditing) {
      return;
    }

    setNotice(
      'Your changes have not been saved. Profile update API integration is pending.',
    );
  }

  const displayName = profile.name || 'Mentor';

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="View your mentor account information and manage the personal details available for editing."
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
              {profile.email || 'Email not available'}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
                Mentor
              </span>

              {profile.designation && (
                <span className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  {profile.designation}
                </span>
              )}
            </div>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Edit Profile
            </button>
          )}
        </div>
      </section>

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
        >
          {notice}
        </div>
      )}

      <SectionCard
        title="Account Information"
        description="Your registered identity and mentor account details."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {PROFILE_FIELDS.map((field) => (
              <ProfileField
                key={field.name}
                field={field}
                value={profile[field.name]}
                onChange={handleChange}
                disabled={!isEditing}
              />
            ))}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="mentor-profile-bio"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Professional Bio
            </label>

            <textarea
              id="mentor-profile-bio"
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              disabled={!isEditing}
              maxLength={1000}
              rows={4}
              placeholder="Share a brief professional introduction."
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
            />

            <p className="text-right text-xs text-slate-500 dark:text-slate-400">
              {profile.bio.length}/1000 characters
            </p>
          </div>

          {isEditing && (
            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                Preview Changes
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </SectionCard>

      <SectionCard
        title="Mentoring Workspace"
        description="Quick access to your assigned academic responsibilities."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/mentor/batches"
            className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:hover:bg-slate-800/60"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              My Batches & Sections
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Review your HOD-assigned batches and sections.
            </p>
          </Link>

          <Link
            to="/mentor/students"
            className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:hover:bg-slate-800/60"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Assigned Students
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Access students within your assigned batches and sections.
            </p>
          </Link>
        </div>
      </SectionCard>

      {!profile.employeeId &&
        !profile.department &&
        !profile.designation && (
          <EmptyState
            title="Additional account details unavailable"
            description="Employee ID, department, and designation will appear when those details are provided by the authenticated account or backend."
          />
        )}

      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        Profile updates are not persisted yet. Permanent changes require
        the authenticated profile-update API.
      </p>
    </div>
  );
}