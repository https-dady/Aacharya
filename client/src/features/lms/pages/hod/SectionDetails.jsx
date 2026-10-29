import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function DetailField({ label, value }) {
  const displayValue =
    value !== undefined && value !== null && String(value).trim() !== ''
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

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function StatusBadge({ status }) {
  const normalizedStatus = String(status || '').toUpperCase();

  const isActive = normalizedStatus === 'ACTIVE';

  const statusClasses = isActive
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : 'border-[#454650] bg-[#292A32] text-[#D0D0D8]';

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-3 py-1.5',
        'text-xs font-medium',
        statusClasses,
      ].join(' ')}
    >
      {status || 'Unknown'}
    </span>
  );
}

export default function SectionDetails() {
  const location = useLocation();

  const section = location.state?.section ?? null;

  const batch = section?.batch ?? {};
  const department = section?.department ?? {};

  const sectionId = section?.id || section?._id;
  const sectionName = section?.name || 'Academic Section';

  const batchId = batch.id || section?.batchId;
  const batchName = batch.name || section?.batchName;
  const batchCode = batch.code || section?.batchCode;
  const academicYear =
    batch.academicYear || section?.academicYear;

  const departmentName =
    department.name || section?.departmentName;

  const departmentCode =
    department.code || section?.departmentCode;

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Section Details"
        description="Review the section record and its associated academic batch."
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
            label: 'Section Details',
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
          description="The section details were not supplied to this page. Return to the section directory and open a section from the available records."
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
            eyebrow="SECTION OVERVIEW"
            title={sectionName}
            description="Section information retrieved from the section directory."
            action={<StatusBadge status={section.status} />}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField
                label="Section Name"
                value={section.name}
              />

              <DetailField
                label="Section Code"
                value={section.code}
              />

              <DetailField
                label="Section ID"
                value={sectionId}
              />

              <DetailField
                label="Status"
                value={section.status}
              />

              <DetailField
                label="Created On"
                value={formatDate(section.createdAt)}
              />

              <DetailField
                label="Last Updated"
                value={formatDate(section.updatedAt)}
              />
            </div>
          </SectionCard>

          <div className="mt-5">
            <SectionCard
              eyebrow="ACADEMIC ORGANIZATION"
              title="Batch Information"
              description="The batch associated with this section."
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
                  label="Batch ID"
                  value={batchId}
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
                  label="Department Code"
                  value={departmentCode}
                />
              </div>
            </SectionCard>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Link to="/hod/sections">
              <ActionButton variant="secondary">
                Back to Directory
              </ActionButton>
            </Link>

            <Link
              to="/hod/sections/edit"
              state={{
                section: {
                  ...section,
                  batchId,
                  batchName,
                  batchCode,
                  academicYear,
                  departmentName,
                  departmentCode,
                },
              }}
            >
              <ActionButton>
                Edit Section
              </ActionButton>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}