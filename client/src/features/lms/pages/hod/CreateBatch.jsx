import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  name: '',
  code: '',
  academicYear: '',
};

function validateForm(form) {
  const errors = {};

  const name = form.name.trim();
  const code = form.code.trim();
  const academicYear = form.academicYear.trim();

  if (!name) {
    errors.name = 'Batch name is required.';
  } else if (name.length < 2) {
    errors.name = 'Batch name must contain at least 2 characters.';
  } else if (name.length > 100) {
    errors.name = 'Batch name cannot exceed 100 characters.';
  }

  if (!code) {
    errors.code = 'Batch code is required.';
  } else if (code.length < 2 || code.length > 30) {
    errors.code = 'Batch code must contain 2 to 30 characters.';
  } else if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(code)) {
    errors.code =
      'Use only letters, numbers, and hyphens. The code cannot start or end with a hyphen.';
  }

  if (!academicYear) {
    errors.academicYear = 'Academic year is required.';
  } else if (!/^\d{4}-\d{4}$/.test(academicYear)) {
    errors.academicYear =
      'Enter the academic year in YYYY-YYYY format.';
  } else {
    const [startYear, endYear] = academicYear
      .split('-')
      .map(Number);

    if (endYear !== startYear + 1) {
      errors.academicYear =
        'The ending year must be exactly one year after the starting year.';
    }
  }

  return errors;
}

function getErrorMessage(error) {
  const status = error?.response?.status;

  if (status === 409) {
    return (
      error?.response?.data?.message
      || error?.response?.data?.error?.message
      || 'A batch with this code already exists for this academic year.'
    );
  }

  if (status === 401) {
    return 'Your session may have expired. Please sign in again.';
  }

  if (status === 403) {
    return 'You are not authorized to create a batch in this department.';
  }

  if (status === 422 || status === 400) {
    return (
      error?.response?.data?.message
      || error?.response?.data?.error?.message
      || 'Please check the entered information and try again.'
    );
  }

  return (
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.message
    || 'Unable to create the batch. Please try again.'
  );
}

export default function CreateBatch() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('error');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === 'code' ? value.toUpperCase() : value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));

    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validationErrors = validateForm(form);

    setErrors(validationErrors);
    setNotice('');

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post(
        '/v1/provisioning/batches',
        {
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          academicYear: form.academicYear.trim(),
        },
      );

      const responseBody = response?.data;
      const data = responseBody?.data ?? responseBody;
      const batch = data?.batch;

      if (!batch || !(batch.id || batch._id)) {
        throw new Error(
          'The server did not return the created batch record.',
        );
      }

      navigate('/hod/batches/details', {
        state: {
          batch,
        },
        replace: true,
      });
    } catch (error) {
      setNotice(getErrorMessage(error));
      setNoticeType('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    if (isSubmitting) {
      return;
    }

    setForm(INITIAL_FORM);
    setErrors({});
    setNotice('');
    setNoticeType('error');
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Create Academic Batch"
        description="Create an academic batch for your department using the existing batch management system."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Batch Management',
            to: '/hod/batches',
          },
          {
            label: 'Create Batch',
          },
        ]}
      />

      <form onSubmit={handleSubmit} noValidate>
        <SectionCard
          eyebrow="BATCH INFORMATION"
          title="Academic batch details"
          description="Enter the batch name, unique batch code, and academic year."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              label="Batch Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. B.Tech AI & Data Science"
              helperText="Use a clear, recognizable name for the academic batch."
              error={errors.name}
              required
              maxLength={100}
              autoComplete="off"
              disabled={isSubmitting}
            />

            <FormField
              label="Batch Code"
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="e.g. AIDS-2026"
              helperText="Use 2–30 characters containing letters, numbers, and hyphens."
              error={errors.code}
              required
              maxLength={30}
              autoComplete="off"
              disabled={isSubmitting}
              spellCheck={false}
            />

            <FormField
              label="Academic Year"
              name="academicYear"
              value={form.academicYear}
              onChange={handleChange}
              placeholder="e.g. 2026-2027"
              helperText="Format: YYYY-YYYY. The ending year must be consecutive."
              error={errors.academicYear}
              required
              inputMode="numeric"
              maxLength={9}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>

          <div className="mt-5 rounded-xl border border-[#454650] bg-[#191A21] p-4">
            <p className="text-sm font-medium text-[#EAEAE6]">
              Department assignment
            </p>

            <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
              The backend automatically assigns this batch to your
              authenticated HOD department. You cannot select or
              modify another department through this form.
            </p>
          </div>
        </SectionCard>

        {notice && (
          <div
            role="alert"
            className={[
              'mt-5 rounded-xl border p-4 text-sm leading-6',
              noticeType === 'error'
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
            ].join(' ')}
          >
            {notice}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/hod/batches"
            className={[
              'inline-flex min-h-11 items-center justify-center',
              'rounded-xl px-4 py-2.5 text-sm font-semibold',
              'text-[#A5A6B0] transition-colors',
              'hover:bg-[#26272B] hover:text-[#EAEAE6]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7]',
              isSubmitting ? 'pointer-events-none opacity-50' : '',
            ].join(' ')}
            aria-disabled={isSubmitting}
            tabIndex={isSubmitting ? -1 : undefined}
            onClick={(event) => {
              if (isSubmitting) {
                event.preventDefault();
              }
            }}
          >
            Back to batches
          </Link>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Reset Form
            </ActionButton>

            <ActionButton
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Batch
            </ActionButton>
          </div>
        </div>
      </form>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Batch creation is processed by the authenticated backend.
        Duplicate batch codes for the same academic year are rejected.
        Your department assignment and permissions are validated on
        the server.
      </p>
    </div>
  );
}