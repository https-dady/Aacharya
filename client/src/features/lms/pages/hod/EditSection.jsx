import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

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

export default function EditSection() {
  const location = useLocation();
  const navigate = useNavigate();

  const section = location.state?.section ?? null;

  const [form, setForm] = useState(() => ({
    name: section?.name || section?.sectionName || '',
    batchId: section?.batchId || '',
    academicYear: section?.academicYear || '',
  }));

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
      'Validation successful. Backend integration is pending, so your changes have not been saved.',
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Edit Section"
        description="Update the academic section information."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Sections', to: '/hod/sections' },
          { label: 'Edit Section' },
        ]}
        actions={
          <Link to="/hod/sections">
            <ActionButton variant="secondary">
              Back to Sections
            </ActionButton>
          </Link>
        }
      />

      {!section ? (
        <EmptyState
          title="Section record unavailable"
          description="No section record was provided to this page. Open a section from the directory before attempting to edit it."
          action={
            <Link to="/hod/sections">
              <ActionButton variant="secondary">
                Return to Section Directory
              </ActionButton>
            </Link>
          }
        />
      ) : (
        <>
          <SectionCard
            eyebrow="SECTION CONFIGURATION"
            title="Section Information"
            description="Edit the available details below. All fields are required."
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
                  placeholder="Enter the associated batch ID"
                  helperText="Use the identifier of the associated batch."
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
                  Validate Changes
                </ActionButton>
              </div>
            </form>
          </SectionCard>

          <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm font-medium text-[#D0D0D8]">
              Changes are not saved yet
            </p>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              This form validates the edited values locally. It does not
              update the original section or persist changes to the
              database. That functionality will be added during backend
              integration.
            </p>
          </div>
        </>
      )}
    </div>
  );
}