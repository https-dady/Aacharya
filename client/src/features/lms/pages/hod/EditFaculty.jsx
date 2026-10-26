import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function getInitialForm(faculty) {
  return {
    institutionalId: faculty?.institutionalId ?? '',
    fullName: faculty?.fullName ?? '',
    email: faculty?.email ?? '',
  };
}

export default function EditFaculty() {
  const location = useLocation();
  const navigate = useNavigate();

  const faculty = location.state?.faculty ?? null;

  const [form, setForm] = useState(() => getInitialForm(faculty));
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setForm(getInitialForm(faculty));
  }, [faculty]);

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

    if (form.institutionalId.trim().length < 2) {
      nextErrors.institutionalId =
        'Institutional ID must contain at least 2 characters.';
    } else if (form.institutionalId.trim().length > 50) {
      nextErrors.institutionalId =
        'Institutional ID cannot exceed 50 characters.';
    }

    if (form.fullName.trim().length < 2) {
      nextErrors.fullName =
        'Full name must contain at least 2 characters.';
    } else if (form.fullName.trim().length > 100) {
      nextErrors.fullName =
        'Full name cannot exceed 100 characters.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      nextErrors.email = 'Enter a valid email address.';
    } else if (form.email.trim().length > 254) {
      nextErrors.email = 'Email address is too long.';
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
      'Details validated successfully. Changes have not been saved because backend integration is not enabled yet.',
    );
  }

  function handleCancel() {
    navigate('/hod/faculty');
  }

  if (!faculty) {
    return (
      <div className="mx-auto w-full max-w-[1000px]">
        <PageHeader
          eyebrow="DEPARTMENT ADMINISTRATION"
          title="Edit Faculty"
          description="Update an existing faculty account."
          breadcrumbs={[
            { label: 'HOD Dashboard', to: '/hod/dashboard' },
            { label: 'Faculty Management', to: '/hod/faculty' },
            { label: 'Edit Faculty' },
          ]}
        />

        <SectionCard
          title="Faculty record unavailable"
          description="Open a faculty member's details page first so the selected record can be passed to the edit form."
        >
          <Link to="/hod/faculty">
            <ActionButton variant="secondary">
              Return to faculty directory
            </ActionButton>
          </Link>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Edit Faculty Details"
        description="Update the institutional identity and contact information of this faculty member."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Faculty Management', to: '/hod/faculty' },
          { label: 'Faculty Details', to: '/hod/faculty/details' },
          { label: 'Edit Faculty' },
        ]}
      />

      <form onSubmit={handleSubmit} noValidate>
        <SectionCard
          eyebrow="ACCOUNT INFORMATION"
          title={faculty.fullName || 'Faculty Member'}
          description="Edit the faculty member's institutional details."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              label="Institutional ID"
              name="institutionalId"
              value={form.institutionalId}
              onChange={handleChange}
              placeholder="Enter institutional ID"
              error={errors.institutionalId}
              required
              autoComplete="off"
              maxLength={50}
            />

            <FormField
              label="Full Name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              error={errors.fullName}
              required
              autoComplete="name"
              maxLength={100}
            />

            <div className="sm:col-span-2">
              <FormField
                label="Institutional Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="faculty@institution.edu"
                helperText="Enter the faculty member's institutional email."
                error={errors.email}
                required
                autoComplete="email"
                maxLength={254}
              />
            </div>
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
            to="/hod/faculty"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#A5A6B0] transition-colors hover:bg-[#26272B] hover:text-[#EAEAE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Back to directory
          </Link>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleCancel}
            >
              Cancel
            </ActionButton>

            <ActionButton type="submit">
              Validate Changes
            </ActionButton>
          </div>
        </div>
      </form>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        This form currently validates changes locally. It does not update
        the database. Saving will be connected to the existing backend
        contract during the integration phase.
      </p>
    </div>
  );
}