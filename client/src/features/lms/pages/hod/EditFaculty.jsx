import { useEffect, useState } from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import facultyManagementService from '../../services/facultyManagementService.js';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function validateForm(form) {
  const errors = {};

  const fullName = form.fullName.trim();
  const email = form.email.trim();

  if (fullName.length < 2 || fullName.length > 100) {
    errors.fullName =
      'Full name must contain between 2 and 100 characters.';
  }

  if (!email) {
    errors.email = 'Email address is required.';
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = 'Enter a valid email address.';
  } else if (email.length > 254) {
    errors.email = 'Email address cannot exceed 254 characters.';
  }

  return errors;
}

function ReadOnlyField({ label, value, helperText }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#D0D0D8]">
        {label}
      </label>

      <div className="flex min-h-11 items-center rounded-xl border border-[#343640] bg-[#14161C] px-4 py-3 text-sm text-[#A5A6B0]">
        {value || 'Not available'}
      </div>

      {helperText && (
        <p className="mt-2 text-xs leading-5 text-[#858590]">
          {helperText}
        </p>
      )}
    </div>
  );
}

function ProtectedAccountDetails({ faculty }) {
  return (
    <SectionCard
      eyebrow="ACCOUNT CONTROL"
      title="Protected account information"
      description="These fields are managed through their respective institutional workflows."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadOnlyField
          label="Account Role"
          value={
            faculty.role === 'MENTOR'
              ? 'Mentor / TG'
              : faculty.role
          }
        />

        <ReadOnlyField
          label="Account Status"
          value={faculty.status}
        />

        <ReadOnlyField
          label="Email Verification"
          value={
            faculty.isEmailVerified
              ? 'Verified'
              : 'Not verified'
          }
        />

        <ReadOnlyField
          label="Department"
          value={faculty.department?.name}
        />
      </div>

      <p className="mt-4 text-xs leading-5 text-[#858590]">
        Department, institutional ID, role, account status,
        password and academic assignments cannot be modified
        through this form.
      </p>
    </SectionCard>
  );
}

export default function EditFaculty() {
  const navigate = useNavigate();

  const { facultyId, id } = useParams();

  const selectedFacultyId = facultyId || id || '';

  const [faculty, setFaculty] = useState(null);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
  });

  const [errors, setErrors] = useState({});

  const [loadError, setLoadError] = useState('');

  const [notice, setNotice] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFaculty() {
      if (!selectedFacultyId) {
        setLoadError('Faculty ID is missing from the URL.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');

      try {
        const result =
          await facultyManagementService.getFaculty(
            selectedFacultyId,
          );

        if (!active) return;

        setFaculty(result);

        setForm({
          fullName: result.fullName ?? '',
          email: result.email ?? '',
        });
      } catch (error) {
        if (!active) return;

        setLoadError(
          error?.message ||
          'Unable to load faculty details.',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadFaculty();

    return () => {
      active = false;
    };
  }, [selectedFacultyId]);

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

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving || isLoading || !faculty) {
      return;
    }

    setErrors({});
    setNotice('');

    const validationErrors = validateForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
    };

    const changedFields = {};

    if (payload.fullName !== faculty.fullName) {
      changedFields.fullName = payload.fullName;
    }

    if (
      payload.email !==
      (faculty.email ?? '').toLowerCase()
    ) {
      changedFields.email = payload.email;
    }

    if (Object.keys(changedFields).length === 0) {
      setNotice('No changes to save.');
      return;
    }

    setIsSaving(true);

    try {
      const updatedFaculty =
        await facultyManagementService.updateFaculty(
          selectedFacultyId,
          changedFields,
        );

      setFaculty(updatedFaculty);

      setForm({
        fullName: updatedFaculty.fullName ?? '',
        email: updatedFaculty.email ?? '',
      });

      setNotice(
        changedFields.email
          ? 'Faculty details updated. The new email requires verification.'
          : 'Faculty details updated successfully.',
      );
    } catch (error) {
      setErrors({
        form:
          error?.message ||
          'Unable to save faculty details.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">

      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Edit Faculty Details"
        description="Update the institutional contact information of a faculty member."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Faculty Management',
            to: '/hod/faculty',
          },
          {
            label: 'Edit Faculty',
          },
        ]}
      />

      {isLoading && (
        <div
          role="status"
          className="rounded-xl border border-[#343640] bg-[#1D1F27] p-4 text-sm text-[#A5A6B0]"
        >
          Loading faculty details...
        </div>
      )}

      {!isLoading && loadError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5"
        >
          <p className="text-sm text-rose-200">
            {loadError}
          </p>

          <Link to="/hod/faculty" className="mt-4 inline-block">
            <ActionButton variant="secondary">
              Return to Directory
            </ActionButton>
          </Link>
        </div>
      )}

      {!isLoading && !loadError && faculty && (
        <>
          {notice && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
            >
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <SectionCard
              eyebrow="ACCOUNT INFORMATION"
              title={faculty.fullName}
              description="Update faculty identity and contact information."
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                <ReadOnlyField
                  label="Institutional ID"
                  value={faculty.institutionalId}
                  helperText="Institutional IDs cannot be changed after account creation."
                />

                <FormField
                  label="Full Name"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  error={errors.fullName}
                  required
                  maxLength={100}
                  disabled={isSaving}
                />

                <div className="sm:col-span-2">
                  <FormField
                    label="Institutional Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="faculty@institution.edu"
                    helperText="Changing the email address resets its verification status."
                    error={errors.email}
                    required
                    maxLength={254}
                    disabled={isSaving}
                  />
                </div>

              </div>
            </SectionCard>

            <div className="mt-5">
              <ProtectedAccountDetails faculty={faculty} />
            </div>

            {errors.form && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
              >
                {errors.form}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:justify-between">

              <Link to="/hod/faculty">
                <ActionButton variant="secondary">
                  Cancel
                </ActionButton>
              </Link>

              <ActionButton
                type="submit"
                loading={isSaving}
                disabled={isLoading}
              >
                Save Changes
              </ActionButton>

            </div>
          </form>
        </>
      )}

    </div>
  );
}