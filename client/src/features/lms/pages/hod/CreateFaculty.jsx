import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

export default function CreateFaculty() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

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

    if (form.institutionalId.trim().length < 2) {
      nextErrors.institutionalId =
        'Institutional ID must contain at least 2 characters.';
    } else if (form.institutionalId.trim().length > 50) {
      nextErrors.institutionalId =
        'Institutional ID cannot exceed 50 characters.';
    }

    if (form.fullName.trim().length < 2) {
      nextErrors.fullName =
        'Full name must contain at least 2 characters.';
    } else if (form.fullName.trim().length > 100) {
      nextErrors.fullName =
        'Full name cannot exceed 100 characters.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      nextErrors.email = 'Enter a valid email address.';
    } else if (form.email.trim().length > 254) {
      nextErrors.email = 'Email address is too long.';
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

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm();

    setErrors(nextErrors);
    setNotice('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setNotice(
      'Form validation successful. Account creation will be enabled during the backend integration phase.',
    );
  }

  function handleCancel() {
    navigate('/hod/faculty');
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Create Faculty Account"
        description="Prepare a faculty account for your department."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Faculty Management', to: '/hod/faculty' },
          { label: 'Create Faculty' },
        ]}
      />

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

        {notice && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"
          >
            {notice}
          </div>
        )}

        {errors.form && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
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
            >
              Cancel
            </ActionButton>

            <ActionButton type="submit">
              Validate Faculty Details
            </ActionButton>
          </div>
        </div>
      </form>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        This form currently validates the entered details locally. It does
        not create an account or send credentials to a server. Account
        creation will be connected to the existing HOD faculty provisioning
        endpoint during backend integration.
      </p>
    </div>
  );
}