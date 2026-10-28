import { useCallback, useEffect, useState } from 'react';
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
    'Unable to complete the request. Please try again.'
  );
}

function normalizeDepartment(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  return {
    id: record.id || record._id || '',
    name: record.name || '',
    code: record.code || '',
    status: record.status || '',
    hod: record.hod || null,
  };
}

function isAvailableDepartment(department) {
  return (
    department.status === 'ACTIVE' &&
    !department.hod
  );
}

export default function CreateHod() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [departmentLoadError, setDepartmentLoadError] = useState('');
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDepartments = useCallback(async () => {
    setIsLoadingDepartments(true);
    setDepartmentLoadError('');

    try {
      const response = await api.get('/v1/departments');
      const records = response?.data?.data;

      if (!Array.isArray(records)) {
        throw new Error(
          'The server returned an unexpected department list response.',
        );
      }

      const normalizedDepartments = records
        .map(normalizeDepartment)
        .filter(Boolean);

      setDepartments(normalizedDepartments);

      setForm((current) => {
        const selectedDepartment = normalizedDepartments.find(
          (department) => department.id === current.departmentId,
        );

        if (
          selectedDepartment &&
          isAvailableDepartment(selectedDepartment)
        ) {
          return current;
        }

        return {
          ...current,
          departmentId: '',
        };
      });
    } catch (error) {
      setDepartments([]);
      setDepartmentLoadError(getErrorMessage(error));
    } finally {
      setIsLoadingDepartments(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const availableDepartments = departments.filter(
    isAvailableDepartment,
  );

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

    const selectedDepartment = availableDepartments.find(
      (department) => department.id === form.departmentId,
    );

    if (!form.departmentId) {
      nextErrors.departmentId = 'Select a department.';
    } else if (!selectedDepartment) {
      nextErrors.departmentId =
        'Select an active department without an assigned HOD.';
    }

    const institutionalId = form.institutionalId.trim();
    const fullName = form.fullName.trim();
    const email = form.email.trim();

    if (!institutionalId) {
      nextErrors.institutionalId = 'Institutional ID is required.';
    } else if (
      institutionalId.length < 2 ||
      institutionalId.length > 50
    ) {
      nextErrors.institutionalId =
        'Institutional ID must contain between 2 and 50 characters.';
    }

    if (!fullName) {
      nextErrors.fullName = 'Full name is required.';
    } else if (fullName.length < 2 || fullName.length > 100) {
      nextErrors.fullName =
        'Full name must contain between 2 and 100 characters.';
    }

    if (!email) {
      nextErrors.email = 'Email address is required.';
    } else if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      nextErrors.password = 'Initial password is required.';
    } else if (
      form.password.length < 8 ||
      form.password.length > 72
    ) {
      nextErrors.password =
        'Password must contain between 8 and 72 characters.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    if (isSubmitting || !validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post(
        `/v1/provisioning/departments/${encodeURIComponent(
          form.departmentId,
        )}/hod`,
        {
          institutionalId: form.institutionalId.trim(),
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
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
        description="Select an available department and enter the new HOD's institutional account details."
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

          {departmentLoadError && (
            <div
              role="alert"
              className="rounded-xl border border-[#B86D78]/40 bg-[#B86D78]/10 p-4"
            >
              <p className="text-sm leading-6 text-[#E9A5AE]">
                Unable to load departments: {departmentLoadError}
              </p>

              <div className="mt-3">
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={loadDepartments}
                  disabled={isLoadingDepartments || isSubmitting}
                >
                  Retry department loading
                </ActionButton>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="departmentId"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Department <span className="text-[#E9A5AE]">*</span>
            </label>

            <select
              id="departmentId"
              name="departmentId"
              value={form.departmentId}
              onChange={handleChange}
              disabled={
                isLoadingDepartments ||
                Boolean(departmentLoadError) ||
                isSubmitting ||
                availableDepartments.length === 0
              }
              aria-invalid={Boolean(errors.departmentId)}
              aria-describedby={
                errors.departmentId
                  ? 'departmentId-error'
                  : 'departmentId-help'
              }
              className="min-h-12 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {isLoadingDepartments
                  ? 'Loading departments...'
                  : availableDepartments.length > 0
                    ? 'Select a department'
                    : 'No eligible departments available'}
              </option>

              {availableDepartments.map((department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.name} ({department.code})
                </option>
              ))}
            </select>

            {errors.departmentId && (
              <p
                id="departmentId-error"
                role="alert"
                className="mt-2 text-xs leading-5 text-[#E9A5AE]"
              >
                {errors.departmentId}
              </p>
            )}

            {!errors.departmentId && (
              <p
                id="departmentId-help"
                className="mt-2 text-xs leading-5 text-[#92929F]"
              >
                Only active departments without an assigned HOD are shown.
              </p>
            )}

            {!isLoadingDepartments &&
              !departmentLoadError &&
              departments.length === 0 && (
                <p className="mt-2 text-xs leading-5 text-[#E5DF98]">
                  Create a department first before provisioning its HOD.
                </p>
              )}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              label="Institutional ID"
              name="institutionalId"
              value={form.institutionalId}
              onChange={handleChange}
              placeholder="Enter institutional ID"
              required
              error={errors.institutionalId}
              autoComplete="off"
              maxLength={50}
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
              maxLength={100}
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

            <div>
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
                maxLength={72}
              />

              <p className="mt-2 text-xs leading-5 text-[#92929F]">
                Choose a strong initial password. The HOD can update
                their profile name after signing in.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/5 p-4">
            <p className="text-sm font-medium text-[#CDB5F7]">
              Department assignment
            </p>

            <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
              Each department can have only one assigned HOD. The server
              validates department availability again when the account
              is created.
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
              disabled={
                isSubmitting ||
                isLoadingDepartments ||
                Boolean(departmentLoadError)
              }
            >
              Create HOD account
            </ActionButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}