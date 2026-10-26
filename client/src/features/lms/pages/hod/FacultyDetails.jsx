import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    SUSPENDED: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    DISABLED: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  };

  return (
    <span
      className={[
        'inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold',
        styles[status] ||
          'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
      ].join(' ')}
    >
      {status || 'Unknown status'}
    </span>
  );
}

export default function FacultyDetails() {
  const location = useLocation();

  // The selected faculty record will be supplied by the directory page.
  // No placeholder record is created when data is unavailable.
  const faculty = location.state?.faculty ?? null;

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Faculty Details"
        description="Review faculty account information and departmental role."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Faculty Management', to: '/hod/faculty' },
          { label: 'Faculty Details' },
        ]}
        actions={
          <Link to="/hod/faculty">
            <ActionButton variant="secondary">
              Back to directory
            </ActionButton>
          </Link>
        }
      />

      {!faculty ? (
        <EmptyState
          title="Faculty record unavailable"
          description="No faculty record was provided to this page. Open a faculty member from the directory after records are connected."
          action={
            <Link to="/hod/faculty">
              <ActionButton>
                Return to faculty directory
              </ActionButton>
            </Link>
          }
        />
      ) : (
        <>
          <SectionCard
            eyebrow="FACULTY ACCOUNT"
            title={faculty.fullName || 'Faculty Member'}
            description="Institutional account information."
            action={<StatusBadge status={faculty.status} />}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField
                label="Full Name"
                value={faculty.fullName}
              />

              <DetailField
                label="Institutional ID"
                value={faculty.institutionalId}
              />

              <DetailField
                label="Email Address"
                value={faculty.email}
              />

              <DetailField
                label="Account Role"
                value={
                  faculty.role === 'MENTOR'
                    ? 'Mentor / TG'
                    : faculty.role || 'Faculty'
                }
              />

              <DetailField
                label="Account Status"
                value={faculty.status}
              />

              <DetailField
                label="Department"
                value={faculty.department?.name || faculty.departmentName}
              />
            </div>
          </SectionCard>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Link to="/hod/faculty">
              <ActionButton variant="secondary">
                Back to directory
              </ActionButton>
            </Link>

            <Link
              to="/hod/faculty/edit"
              state={{ faculty }}
            >
              <ActionButton>
                Edit Faculty Details
              </ActionButton>
            </Link>
          </div>
        </>
      )}

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Faculty details and account operations will use the authenticated
        HOD's department scope. Records are not fabricated or loaded from
        sample data.
      </p>
    </div>
  );
}