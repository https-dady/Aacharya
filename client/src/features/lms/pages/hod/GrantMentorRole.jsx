import { useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  institutionalId: '',
  batch: '',
  section: '',
};

export default function GrantMentorRole() {
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

    if (form.institutionalId.trim().length < 2) {
      nextErrors.institutionalId =
        'Enter a valid faculty institutional ID.';
    }

    if (!form.batch.trim()) {
      nextErrors.batch = 'Enter the assigned batch.';
    }

    if (!form.section.trim()) {
      nextErrors.section = 'Enter the assigned section.';
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
      'Details validated. The Mentor/TG role and assignment have not been saved because backend integration is not enabled yet.',
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
        title="Grant Mentor / TG Role"
        description="Designate a faculty member as a mentor and specify their batch and section assignment."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Faculty Management', to: '/hod/faculty' },
          { label: 'Grant Mentor / TG Role' },
        ]}
      />

      <div className="mb-6 rounded-2xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 p-5">
        <h2 className="text-sm font-semibold text-[#D8C7FA]">
          Role assignment rules
        </h2>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-[#B8B8C2]">
          <li>
            • Only an authorized HOD can grant the Mentor/TG role.
          </li>
          <li>
            • The selected faculty member must belong to the HOD's department.
          </li>
          <li>
            • Mentor assignments must respect the department's batch and section structure.
          </li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <SectionCard
          eyebrow="MENTOR DESIGNATION"
          title="Faculty member"
          description="Identify the existing faculty account that should receive the Mentor/TG role."
        >
          <FormField
            label="Faculty Institutional ID"
            name="institutionalId"
            value={form.institutionalId}
            onChange={handleChange}
            placeholder="Enter existing faculty ID"
            helperText="Use the institutional ID of an existing faculty account."
            error={errors.institutionalId}
            required
            autoComplete="off"
            maxLength={50}
          />
        </SectionCard>

        <div className="mt-5">
          <SectionCard
            eyebrow="MENTOR ALLOCATION"
            title="Batch and section"
            description="Specify the academic group for the mentor assignment."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                label="Batch"
                name="batch"
                value={form.batch}
                onChange={handleChange}
                placeholder="Enter batch identifier"
                helperText="Use the existing batch identifier."
                error={errors.batch}
                required
                maxLength={100}
              />

              <FormField
                label="Section"
                name="section"
                value={form.section}
                onChange={handleChange}
                placeholder="Enter section identifier"
                helperText="Use a section belonging to the selected batch."
                error={errors.section}
                required
                maxLength={100}
              />
            </div>
          </SectionCard>
        </div>

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
            Back to faculty
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
              Validate Assignment
            </ActionButton>
          </div>
        </div>
      </form>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        This is a frontend-only form. It does not grant roles or save
        assignments yet. During integration, the faculty, batch and section
        selectors will be connected to the existing authorized backend
        contracts.
      </p>
    </div>
  );
}