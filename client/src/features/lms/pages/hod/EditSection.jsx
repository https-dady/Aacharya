import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import sectionManagementService from '../../services/sectionManagementService.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function validateForm(form) {
  const errors = {};

  const name = form.name.trim();
  const code = form.code.trim();

  if (!name) {
    errors.name = 'Section name is required.';
  } else if (name.length > 50) {
    errors.name = 'Section name cannot exceed 50 characters.';
  }

  if (!code) {
    errors.code = 'Section code is required.';
  } else if (code.length > 20) {
    errors.code = 'Section code cannot exceed 20 characters.';
  } else if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(code)) {
    errors.code =
      'Use letters, numbers, and single hyphens between code parts.';
  }

  return errors;
}

function getErrorMessage(error) {
  const status = error?.response?.status;

  if (status === 400) {
    return 'The section information or section ID is invalid.';
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (status === 403) {
    return 'You are not authorized to update this section.';
  }

  if (status === 404) {
    return 'The section was not found in your department.';
  }

  if (status === 409) {
    return (
      error?.response?.data?.message
      || 'Another section with this code already exists in the selected batch.'
    );
  }

  if (status === 422) {
    return (
      error?.response?.data?.message
      || 'The section information failed server-side validation.'
    );
  }

  return (
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.message
    || 'Unable to update the section. Please try again.'
  );
}

function DetailField({ label, value }) {
  const displayValue =
    value !== undefined
    && value !== null
    && String(value).trim() !== ''
      ? String(value)
      : 'Not available';

  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {displayValue}
      </p>
    </div>
  );
}

export default function EditSection() {
  const location = useLocation();
  const navigate = useNavigate();

  const section = location.state?.section ?? null;

  const sectionId = section?.id || section?._id;

  const batch = section?.batch ?? {};
  const department = section?.department ?? {};

  const batchName = batch.name || section?.batchName;
  const batchCode = batch.code || section?.batchCode;

  const academicYear =
    batch.academicYear || section?.academicYear;

  const departmentName =
    department.name || section?.departmentName;

  const [form, setForm] = useState(() => ({
    name: section?.name || section?.sectionName || '',
    code: section?.code || '',
  }));

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === 'code'
        ? value.toUpperCase()
        : value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));

    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const validationErrors = validateForm(form);

    setErrors(validationErrors);
    setNotice('');

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (!sectionId) {
      setNotice(
        'Section ID is missing. Return to the section directory and open the section again.',
      );

      return;
    }

    setIsSaving(true);

    try {
      const updatedSection =
        await sectionManagementService.updateSection(
          sectionId,
          {
            name: form.name.trim(),
            code: form.code.trim().toUpperCase(),
          },
        );

      const updatedRecord = {
        ...section,
        ...updatedSection,

        batch: updatedSection.batch || batch,

        batchName:
          updatedSection.batch?.name
          || batchName
          || '',

        batchCode:
          updatedSection.batch?.code
          || batchCode
          || '',

        academicYear:
          updatedSection.batch?.academicYear
          || academicYear
          || '',

        department:
          updatedSection.department || department,

        departmentName:
          updatedSection.department?.name
          || departmentName
          || '',
      };

      navigate('/hod/sections/details', {
        replace: true,
        state: {
          section: updatedRecord,
        },
      });
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (!section) {
    return (
      <div className="mx-auto w-full max-w-[1000px]">
        <PageHeader
          eyebrow="DEPARTMENT ADMINISTRATION"
          title="Edit Section"
          description="Update an existing academic section."
          breadcrumbs={[
            {
              label: 'HOD Dashboard',
              to: '/hod/dashboard',
            },
            {
              label: 'Sections',
              to: '/hod/sections',
            },
            {
              label: 'Edit Section',
            },
          ]}
        />

        <EmptyState
          title="Section record unavailable"
          description="The section information was not supplied to this page. Return to the section directory and open the section again."
          action={
            <Link to="/hod/sections">
              <ActionButton variant="secondary">
                Return to Sections
              </ActionButton>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Edit Section"
        description="Update the section name and code without changing its academic batch or department association."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Sections',
            to: '/hod/sections',
          },
          {
            label: 'Edit Section',
          },
        ]}
        actions={
          <Link
            to="/hod/sections/details"
            state={{ section }}
          >
            <ActionButton variant="secondary">
              Back to Details
            </ActionButton>
          </Link>
        }
      />

      <SectionCard
        eyebrow="SECTION CONFIGURATION"
        title="Update Section Information"
        description="Make the required changes and save them to the department records."
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
              maxLength={50}
              autoComplete="off"
              disabled={isSaving}
            />

            <FormField
              label="Section Code"
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="e.g. AIDS-A"
              helperText="Letters, numbers, and hyphens. Maximum 20 characters."
              error={errors.code}
              required
              maxLength={20}
              autoComplete="off"
              disabled={isSaving}
              spellCheck={false}
            />
          </div>

          {notice && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-[#D58B95]/30 bg-[#D58B95]/10 p-4 text-sm leading-6 text-[#E8AAB2]"
            >
              {notice}
            </div>
          )}

          <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
            <ActionButton
              type="button"
              variant="secondary"
              disabled={isSaving}
              onClick={() => {
                navigate('/hod/sections/details', {
                  state: { section },
                });
              }}
            >
              Cancel
            </ActionButton>

            <ActionButton
              type="submit"
              loading={isSaving}
              disabled={isSaving}
            >
              Save Changes
            </ActionButton>
          </div>
        </form>
      </SectionCard>

      <div className="mt-5">
        <SectionCard
          eyebrow="ACADEMIC ORGANIZATION"
          title="Associated Batch and Department"
          description="These associations are maintained by the backend and cannot be changed through this form."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField
              label="Batch Name"
              value={batchName}
            />

            <DetailField
              label="Batch Code"
              value={batchCode}
            />

            <DetailField
              label="Academic Year"
              value={academicYear}
            />

            <DetailField
              label="Department"
              value={departmentName}
            />

            <DetailField
              label="Section Status"
              value={section.status}
            />

            <DetailField
              label="Section ID"
              value={sectionId}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}