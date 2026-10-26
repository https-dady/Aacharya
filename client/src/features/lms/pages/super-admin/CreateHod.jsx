import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  departmentId: '',
  institutionalId: '',
  fullName: '',
  email: '',
  password: '',
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Unable to create the HOD account. Please try again.'
  );
}

export default function CreateHod() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
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
    }));

    setSubmitError('');
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.departmentId.trim()) {
      nextErrors.departmentId = 'Department ID is required.';
    }

    if (!form.institutionalId.trim()) {
      nextErrors.institutionalId = 'Institutional ID is required.';
    }

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.';
    } else if (form.password.length < 8) {
      nextErrors.password =
        'Password must contain at least 8 characters.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post(
        `/v1/provisioning/departments/${encodeURIComponent(
          form.departmentId.trim(),
        )}/hod`,
        {
          institutionalId: form.institutionalId.trim(),
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
        },
      );

      navigate('/super-admin/hods', {
        replace: true,
        state: {
          notice: 'HOD account created successfully.',
        },
      });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="SUPER ADMINISTRATION"
        title="Create HOD account"
        description="Provision a Head of Department account for an existing department."
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: '/super-admin/dashboard',
          },
          {
            label: 'HOD Accounts',
            to: '/super-admin/hods',
          },
          {
            label: 'Create HOD',
          },
        ]}
      />

      <SectionCard
        eyebrow="ACCOUNT PROVISIONING"
        title="HOD information"
        description="Provide the department identifier and the new HOD's institutional account details."
      >
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-6"
        >
          {submitError && (
            <div
              role="alert"
              className="rounded-xl border border-[#B86D78]/40 bg-[#B86D78]/10 px-4 py-3 text-sm leading-6 text-[#E9A5AE]"
            >
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              label="Department ID"
              name="departmentId"
              value={form.departmentId}
              onChange={handleChange}
              placeholder="Enter the existing department ID"
              required
              error={errors.departmentId}
              autoComplete="off"
            />

            <FormField
              label="Institutional ID"
              name="institutionalId"
              value={form.institutionalId}
              onChange={handleChange}
              placeholder="Enter institutional ID"
              required
              error={errors.institutionalId}
              autoComplete="off"
            />

            <FormField
              label="Full name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Enter HOD's full name"
              required
              error={errors.fullName}
              autoComplete="name"
              maxLength={120}
            />

            <FormField
              label="Email address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="hod@institution.edu"
              required
              error={errors.email}
              autoComplete="email"
              maxLength={254}
            />

            <div className="md:col-span-2">
              <FormField
                label="Initial password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Create an initial password"
                required
                error={errors.password}
                autoComplete="new-password"
                maxLength={128}
              />

              <p className="mt-2 text-xs leading-5 text-[#92929F]">
                Use a strong password that meets your institution's
                security requirements.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/5 p-4">
            <p className="text-sm font-medium text-[#CDB5F7]">
              Before creating the account
            </p>

            <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
              Ensure the department ID belongs to an existing department.
              This form does not fetch department records because the
              current backend does not expose a department listing
              endpoint.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#383943] pt-5 sm:flex-row sm:justify-end">
            <ActionButton
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => navigate('/super-admin/hods')}
            >
              Cancel
            </ActionButton>

            <ActionButton
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create HOD account
            </ActionButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}