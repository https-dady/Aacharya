import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  institutionalId: '',
  batch: '',
  section: '',
};

function normalizeFacultyId(faculty) {
  return (
    faculty?.institutionalId ??
    faculty?.employeeId ??
    faculty?.staffId ??
    ''
  );
}

function validateForm(form) {
  const errors = {};

  if (form.institutionalId.trim().length < 2) {
    errors.institutionalId =
      'Enter a valid faculty institutional ID.';
  }

  if (!form.batch.trim()) {
    errors.batch = 'Enter the assigned batch identifier.';
  }

  if (!form.section.trim()) {
    errors.section = 'Enter the assigned section identifier.';
  }

  return errors;
}

function RuleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <path
        d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-[#858590]">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

export default function GrantMentorRole() {
  const location = useLocation();

  const selectedFaculty = location.state?.faculty ?? null;

  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    institutionalId: normalizeFacultyId(selectedFaculty),
  }));

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);

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

    setNotice(null);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm(form);

    setErrors(nextErrors);
    setNotice(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setNotice({
      type: 'info',
      message:
        'Form validation successful. No role or mentor assignment has been saved. Backend integration is required to verify the faculty account and persist this assignment.',
    });
  }

  function handleReset() {
    setForm({
      ...INITIAL_FORM,
      institutionalId: normalizeFacultyId(selectedFaculty),
    });

    setErrors({});
    setNotice(null);
  }

  const hasSelectedFaculty = Boolean(
    selectedFaculty &&
      (
        selectedFaculty.fullName ||
        selectedFaculty.institutionalId ||
        selectedFaculty.employeeId ||
        selectedFaculty.staffId
      ),
  );

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Grant Mentor / TG Role"
        description="Designate an existing faculty member as a mentor and define their batch and section assignment."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Faculty Management', to: '/hod/faculty' },
          { label: 'Grant Mentor / TG Role' },
        ]}
        actions={
          <Link
            to="/hod/faculty"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-3.5 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:border-[#CDB5F7]/50 hover:bg-[#CDB5F7]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Faculty directory
          </Link>
        }
      />

      <div className="mb-6 rounded-2xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]">
            <RuleIcon />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#D8C7FA]">
              Role assignment rules
            </h2>

            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#B8B8C2]">
              <li>
                Only an authorized HOD can grant the Mentor/TG role.
              </li>
              <li>
                The faculty account must belong to the HOD's department.
              </li>
              <li>
                Mentor allocation must respect the existing batch and
                section structure.
              </li>
              <li>
                A faculty member may retain teaching responsibilities
                while also holding the Mentor/TG role.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {hasSelectedFaculty ? (
        <SectionCard
          eyebrow="SELECTED ACCOUNT"
          title="Faculty member"
          description="The faculty information below was passed from the previous page. Verify the institutional ID before continuing."
          className="mb-5"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-lg font-semibold text-[#CDB5F7]">
              {(selectedFaculty.fullName || 'F')
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="grid min-w-0 flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
              <InfoItem
                label="Faculty name"
                value={selectedFaculty.fullName}
              />

              <InfoItem
                label="Institutional ID"
                value={normalizeFacultyId(selectedFaculty)}
              />

              <InfoItem
                label="Email address"
                value={selectedFaculty.email}
              />

              <InfoItem
                label="Current role"
                value={selectedFaculty.role || 'Faculty'}
              />
            </div>
          </div>
        </SectionCard>
      ) : (
        <div className="mb-5">
          <EmptyState
            title="No faculty account selected"
            description="You opened this page without a faculty record. Enter the institutional ID of an existing faculty member below. The account cannot be verified until backend integration is available."
            action={
              <Link to="/hod/faculty">
                <ActionButton variant="secondary">
                  Open faculty directory
                </ActionButton>
              </Link>
            }
          />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <SectionCard
          eyebrow="MENTOR DESIGNATION"
          title="Faculty identification"
          description="Identify the existing faculty account that should receive the Mentor/TG role."
        >
          <FormField
            label="Faculty Institutional ID"
            name="institutionalId"
            value={form.institutionalId}
            onChange={handleChange}
            placeholder="Enter existing faculty ID"
            helperText={
              hasSelectedFaculty
                ? 'Prefilled from the selected faculty record. Verify the ID before proceeding.'
                : 'Enter the institutional ID assigned to an existing faculty account.'
            }
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
            description="Specify the existing academic group for the mentor assignment. Use the identifiers defined by your institution."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                label="Batch identifier"
                name="batch"
                value={form.batch}
                onChange={handleChange}
                placeholder="Enter existing batch identifier"
                helperText="Enter a batch identifier from the academic structure."
                error={errors.batch}
                required
                maxLength={100}
                autoComplete="off"
              />

              <FormField
                label="Section identifier"
                name="section"
                value={form.section}
                onChange={handleChange}
                placeholder="Enter existing section identifier"
                helperText="Enter a section belonging to the specified batch."
                error={errors.section}
                required
                maxLength={100}
                autoComplete="off"
              />
            </div>

            <div className="mt-5 rounded-xl border border-[#454650] bg-[#14161C]/60 p-4">
              <p className="text-sm font-medium text-[#EAEAE6]">
                Assignment scope
              </p>

              <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
                This form collects one batch and one section. The actual
                relationship between the faculty member, batch and section
                must be verified by the backend before the assignment can
                be saved.
              </p>
            </div>
          </SectionCard>
        </div>

        {notice && (
          <div
            role="status"
            className={[
              'mt-5 rounded-xl border p-4 text-sm leading-6',
              notice.type === 'info'
                ? 'border-sky-500/25 bg-sky-500/10 text-sky-200'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-200',
            ].join(' ')}
          >
            {notice.message}
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
              Reset form
            </ActionButton>

            <ActionButton type="submit">
              Validate assignment
            </ActionButton>
          </div>
        </div>
      </form>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Frontend-only workflow: this page does not grant roles, verify
        accounts, or save assignments. Faculty, batch and section
        selectors will be connected to the authorized backend contracts
        during the integration phase.
      </p>
    </div>
  );
}