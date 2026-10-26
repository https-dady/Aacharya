import { useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  name: '',
  academicYear: '',
};

export default function CreateBatch() {
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
    }));

    setNotice('');
  }

  function validateForm() {
    const nextErrors = {};

    if (form.name.trim().length < 2) {
      nextErrors.name = 'Batch name must contain at least 2 characters.';
    } else if (form.name.trim().length > 100) {
      nextErrors.name = 'Batch name cannot exceed 100 characters.';
    }

    if (!form.academicYear.trim()) {
      nextErrors.academicYear = 'Academic year is required.';
    } else if (
      !/^\d{4}-\d{4}$/.test(form.academicYear.trim())
    ) {
      nextErrors.academicYear =
        'Enter the academic year in YYYY-YYYY format.';
    } else {
      const [startYear, endYear] = form.academicYear
        .trim()
        .split('-')
        .map(Number);

      if (endYear !== startYear + 1) {
        nextErrors.academicYear =
          'The ending year must be one year after the starting year.';
      }
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
      'Batch details validated successfully. The batch has not been created because backend integration is not enabled yet.',
    );
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setErrors({});
    setNotice('');
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Create Academic Batch"
        description="Enter the basic information for a departmental academic batch."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Batch Management', to: '/hod/batches' },
          { label: 'Create Batch' },
        ]}
      />

      <form onSubmit={handleSubmit} noValidate>
        <SectionCard
          eyebrow="BATCH INFORMATION"
          title="Academic batch details"
          description="Provide the batch name and its academic year."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              label="Batch Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. B.Tech AI & Data Science"
              helperText="Use a clear, recognizable name for the batch."
              error={errors.name}
              required
              maxLength={100}
            />

            <FormField
              label="Academic Year"
              name="academicYear"
              value={form.academicYear}
              onChange={handleChange}
              placeholder="e.g. 2026-2027"
              helperText="Format: YYYY-YYYY"
              error={errors.academicYear}
              required
              inputMode="numeric"
              maxLength={9}
            />
          </div>
        </SectionCard>

        {notice && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"
          >
            {notice}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/hod/batches"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#A5A6B0] transition-colors hover:bg-[#26272B] hover:text-[#EAEAE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Back to batches
          </Link>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleReset}
            >
              Reset Form
            </ActionButton>

            <ActionButton type="submit">
              Validate Batch Details
            </ActionButton>
          </div>
        </div>
      </form>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        This form validates the entered information locally. It does not
        create a database record. Batch creation will be connected to the
        appropriate existing backend contract during the integration phase.
      </p>
    </div>
  );
}