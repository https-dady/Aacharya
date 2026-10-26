import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  name: '',
  code: '',
  description: '',
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Unable to create the department. Please try again.'
  );
}

export default function CreateDepartment() {
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

    if (!form.name.trim()) {
      nextErrors.name = 'Department name is required.';
    }

    if (!form.code.trim()) {
      nextErrors.code = 'Department code is required.';
    } else if (!/^[A-Za-z0-9_-]+$/.test(form.code.trim())) {
      nextErrors.code =
        'Use only letters, numbers, hyphens or underscores.';
    }

    if (form.description.length > 500) {
      nextErrors.description =
        'Description must not exceed 500 characters.';
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
      await api.post('/v1/departments', {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
      });

      navigate('/super-admin/departments', {
        replace: true,
        state: {
          notice: 'Department created successfully.',
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
        title="Create department"
        description="Register a department within the institution."
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: '/super-admin/dashboard',
          },
          {
            label: 'Departments',
            to: '/super-admin/departments',
          },
          {
            label: 'Create department',
          },
        ]}
      />

      <SectionCard
        eyebrow="DEPARTMENT SETUP"
        title="Department information"
        description="Enter the department's official name, unique code and optional description."
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
              label="Department name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Computer Science"
              required
              error={errors.name}
              autoComplete="organization-title"
              maxLength={120}
            />

            <FormField
              label="Department code"
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="e.g. CSE"
              required
              error={errors.code}
              maxLength={20}
              autoCapitalize="characters"
            />
          </div>

          <FormField
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Optional description of the department"
            error={errors.description}
            maxLength={500}
          />

          <div className="flex flex-col-reverse gap-3 border-t border-[#383943] pt-5 sm:flex-row sm:justify-end">
            <ActionButton
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => navigate('/super-admin/departments')}
            >
              Cancel
            </ActionButton>

            <ActionButton
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create department
            </ActionButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}