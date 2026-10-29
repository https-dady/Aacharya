import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  institutionalId: '',
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Unable to create the faculty account. Please try again.'
  );
}

function getResponseData(response) {
  const body = response?.data;

  return body?.data ?? body ?? {};
}

export default function CreateFaculty() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [createdFaculty, setCreatedFaculty] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
      form: '',
    }));

    setNotice('');
  }

  function validateForm() {
    const nextErrors = {};

    const institutionalId = form.institutionalId.trim();
    const fullName = form.fullName.trim();
    const email = form.email.trim();

    if (institutionalId.length < 2) {
      nextErrors.institutionalId =
        'Institutional ID must contain at least 2 characters.';
    } else if (institutionalId.length > 50) {
      nextErrors.institutionalId =
        'Institutional ID cannot exceed 50 characters.';
    }

    if (fullName.length < 2) {
      nextErrors.fullName =
        'Full name must contain at least 2 characters.';
    } else if (fullName.length > 100) {
      nextErrors.fullName =
        'Full name cannot exceed 100 characters.';
    }

    if (!email) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.';
    } else if (email.length > 254) {
      nextErrors.email = 'Email address cannot exceed 254 characters.';
    }

    if (form.password.length < 8) {
      nextErrors.password =
        'Password must contain at least 8 characters.';
    } else if (form.password.length > 72) {
      nextErrors.password =
        'Password cannot exceed 72 characters.';
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword =
        'Please confirm the password.';
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword =
        'Passwords do not match.';
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrors({});
    setNotice('');
    setCreatedFaculty(null);

    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post(
        '/v1/provisioning/faculty',
        {
          institutionalId: form.institutionalId.trim().toUpperCase(),
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        },
      );

      const data = getResponseData(response);
      const faculty = data.user;

      if (!faculty?.id) {
        throw new Error(
          'The server did not return the created faculty account.',
        );
      }

      setCreatedFaculty(faculty);

      setNotice(
        data.message || 'Faculty account created successfully.',
      );

      setForm(INITIAL_FORM);
      setErrors({});
    } catch (error) {
      setErrors({
        form: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    navigate('/hod/faculty');
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Create Faculty Account"
        description="Create a faculty account for your department."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Faculty Management',
            to: '/hod/faculty',
          },
          {
            label: 'Create Faculty',
          },
        ]}
      />

      {notice && createdFaculty && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5"
        >
          <p className="text-sm font-semibold text-emerald-300">
            Faculty account created
          </p>

          <p className="mt-2 text-sm leading-6 text-[#D0D0D8]">
            {notice}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[#92929F]">
                Faculty Name
              </p>

              <p className="mt-1 text-sm font-medium text-[#EAEAE6]">
                {createdFaculty.fullName}
              </p>
            </div>

            <div>
              <p className="text-xs text-[#92929F]">
                Institutional ID
              </p>

              <p className="mt-1 text-sm font-medium text-[#EAEAE6]">
                {createdFaculty.institutionalId}
              </p>
            </div>
          </div>

          <Link
            to="/hod/faculty"
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-500/30 px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            View Faculty Directory
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <SectionCard
          eyebrow="ACCOUNT INFORMATION"
          title="Faculty details"
          description="Enter the institutional identity and login credentials for the new faculty member."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              label="Institutional ID"
              name="institutionalId"
              value={form.institutionalId}
              onChange={handleChange}
              placeholder="e.g. FAC2026001"
              helperText="Must be unique across the institution."
              error={errors.institutionalId}
              required
              autoComplete="off"
              maxLength={50}
            />

            <FormField
              label="Full Name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Enter faculty member's full name"
              error={errors.fullName}
              required
              autoComplete="name"
              maxLength={100}
            />

            <div className="sm:col-span-2">
              <FormField
                label="Institutional Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="faculty@institution.edu"
                helperText="Use the faculty member's institutional email address."
                error={errors.email}
                required
                autoComplete="email"
                maxLength={254}
              />
            </div>
          </div>
        </SectionCard>

        <div className="mt-5">
          <SectionCard
            eyebrow="LOGIN SECURITY"
            title="Account credentials"
            description="Set an initial password for the faculty account."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                label="Initial Password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter initial password"
                helperText="Use between 8 and 72 characters."
                error={errors.password}
                required
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
              />

              <FormField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter initial password"
                error={errors.confirmPassword}
                required
                autoComplete="new-password"
                maxLength={72}
              />
            </div>
          </SectionCard>
        </div>

        {errors.form && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-200"
          >
            {errors.form}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/hod/faculty"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#A5A6B0] transition-colors hover:bg-[#26272B] hover:text-[#EAEAE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Back to faculty directory
          </Link>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </ActionButton>

            <ActionButton
              type="submit"
              disabled={isSubmitting || Boolean(createdFaculty)}
            >
              {isSubmitting
                ? 'Creating Account...'
                : createdFaculty
                  ? 'Account Created'
                  : 'Create Faculty Account'}
            </ActionButton>
          </div>
        </div>
      </form>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        The account is created under your authenticated department.
        The initial password is sent only to the backend for hashing;
        it is not displayed in the success message.
      </p>
    </div>
  );
}