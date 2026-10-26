import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  name: '',
  batchId: '',
  academicYear: '',
};

function validateForm(form) {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = 'Section name is required.';
  } else if (form.name.trim().length > 50) {
    errors.name = 'Section name cannot exceed 50 characters.';
  }

  if (!form.batchId.trim()) {
    errors.batchId = 'Batch ID is required.';
  }

  if (!form.academicYear.trim()) {
    errors.academicYear = 'Academic year is required.';
  } else if (!/^\d{4}-\d{4}$/.test(form.academicYear.trim())) {
    errors.academicYear = 'Use the format YYYY-YYYY.';
  } else {
    const [startYear, endYear] = form.academicYear
      .trim()
      .split('-')
      .map(Number);

    if (endYear !== startYear + 1) {
      errors.academicYear =
        'The end year must be exactly one year after the start year.';
    }
  }

  return errors;
}

export default function CreateSection() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialBatchId = location.state?.batchId || '';
  const initialBatchName = location.state?.batchName || '';

  const [form, setForm] = useState({
    ...INITIAL_FORM,
    batchId: initialBatchId,
  });

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

  function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setNotice('');
      return;
    }

    setNotice(
      'Validation successful. Section creation is not connected to the backend yet, so no record has been saved.',
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Create Section"
        description="Prepare an academic section and associate it with its batch."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Sections', to: '/hod/sections' },
          { label: 'Create Section' },
        ]}
        actions={
          <Link to="/hod/sections">
            <ActionButton variant="secondary">
              Back to Sections
            </ActionButton>
          </Link>
        }
      />

      <SectionCard
        eyebrow="SECTION CONFIGURATION"
        title="Section Information"
        description="Enter the section details. All fields are required."
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              label="Section Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Section A"
              helperText="Enter a recognizable name for the section."
              error={errors.name}
              required
              autoComplete="off"
            />

            <FormField
              label="Batch ID"
              name="batchId"
              value={form.batchId}
              onChange={handleChange}
              placeholder="Enter the existing batch ID"
              helperText={
                initialBatchName
                  ? `Opened from batch: ${initialBatchName}. Verify its ID before proceeding.`
                  : 'Use the identifier of an existing batch.'
              }
              error={errors.batchId}
              required
              autoComplete="off"
            />

            <FormField
              label="Academic Year"
              name="academicYear"
              value={form.academicYear}
              onChange={handleChange}
              placeholder="e.g. 2026-2027"
              helperText="Use consecutive years in YYYY-YYYY format."
              error={errors.academicYear}
              required
              autoComplete="off"
            />
          </div>

          {notice && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"
            >
              {notice}
            </div>
          )}

          <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => navigate('/hod/sections')}
            >
              Cancel
            </ActionButton>

            <ActionButton type="submit">
              Validate Section
            </ActionButton>
          </div>
        </form>
      </SectionCard>

      <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#D0D0D8]">
          Before you continue
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          This form currently validates input locally. It does not verify
          whether the batch exists, create a section, or save any data.
          Batch lookup and persistence will be implemented during backend
          integration.
        </p>
      </div>
    </div>
  );
}