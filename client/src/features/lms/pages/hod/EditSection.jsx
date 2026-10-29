import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

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

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {value !== undefined && value !== null && String(value).trim()
          ? String(value)
          : 'Not available'}
      </p>
    </div>
  );
}

function getErrorMessage(error) {
  const responseData = error?.response?.data;

  return (
    responseData?.message
    || responseData?.error?.message
    || error?.message
    || 'Unable to update the section. Please try again.'
  );
}

export default function EditSection() {
  const location = useLocation();
  const navigate = useNavigate();

  const section = location.state?.section ?? null;

  const sectionId = section?.id || section?._id;

  const batch = section?.batch ?? {};

  const batchName = batch.name || section?.batchName;
  const batchCode = batch.code || section?.batchCode;

  const academicYear =
    batch.academicYear || section?.academicYear;

  const departmentName =
    section?.department?.name || section?.departmentName;

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
      [name]: value,
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
      const response = await api.patch(
        `/v1/provisioning/sections/${sectionId}`,
        {
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
        },
      );

      const responseBody = response?.data;
      const updatedSection = responseBody?.data?.section;

      if (!responseBody?.success || !updatedSection) {
        throw new Error(
          responseBody?.message
          || 'The server did not return the updated section record.',
        );
      }

      navigate('/hod/sections/details', {
        replace: true,
        state: {
          section: {
            ...section,
            ...updatedSection,

            batch: updatedSection.batch || batch,

            department:
              updatedSection.department || section?.department,

            batchName:
              updatedSection.batch?.name || batchName,

            batchCode:
              updatedSection.batch?.code || batchCode,

            academicYear:
              updatedSection.batch?.academicYear || academicYear,

            departmentName:
              updatedSection.department?.name || departmentName,
          },
        },
      });
    } catch (error) {
      const message = getErrorMessage(error);

      if (error?.response?.status === 409) {
        setErrors((current) => ({
          ...current,
          code: message,
        }));

        setNotice(
          'The section could not be updated because the requested change conflicts with an existing record.',
        );
      } else if (error?.response?.status === 403) {
        setNotice(
          'You are not authorized to update this section. Only an authorized HOD can update sections within their department.',
        );
      } else if (error?.response?.status === 404) {
        setNotice(
          'This section was not found in your department. Return to the section directory and refresh the records.',
        );
      } else {
        setNotice(message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Edit Section"
        description="Update the section name and code for the existing academic section."
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
          description="No section record was provided to this page. Return to the section directory and select a section before attempting to edit it."
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
            title={section.name || section.sectionName || 'Academic Section'}
            description="Update the editable fields below. Changes are saved to the backend when you submit the form."
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
                  maxLength={50}
                  disabled={isSaving}
                />

                <FormField
                  label="Section Code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. A"
                  helperText="Letters, numbers, and hyphens are supported."
                  error={errors.code}
                  required
                  autoComplete="off"
                  maxLength={20}
                  disabled={isSaving}
                />
              </div>

              {notice && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"
                >
                  {notice}
                </div>
              )}

              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => navigate('/hod/sections')}
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
              description="These existing associations are displayed for reference and cannot be changed through this form."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </>
      )}
    </div>
  );
}