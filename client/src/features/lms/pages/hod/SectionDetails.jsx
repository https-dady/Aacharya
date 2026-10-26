import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function DetailField({ label, value }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

export default function SectionDetails() {
  const location = useLocation();
  const section = location.state?.section ?? null;

  const sectionId = section?.id || section?._id;
  const sectionName =
    section?.name || section?.sectionName || 'Academic Section';

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Section Details"
        description="Review the academic section and its associated batch information."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Sections', to: '/hod/sections' },
          { label: 'Section Details' },
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
          description="No section record was provided to this page. Open a section from the section directory when actual records are available."
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
            description="Academic section information."
            action={
              <span className="inline-flex rounded-full border border-[#454650] bg-[#292A32] px-3 py-1.5 text-xs font-medium text-[#D0D0D8]">
                {section.status || 'Status unavailable'}
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField
                label="Section Name"
                value={sectionName}
              />

              <DetailField
                label="Section ID"
                value={sectionId}
              />

              <DetailField
                label="Batch Name"
                value={section.batchName}
              />

              <DetailField
                label="Batch ID"
                value={section.batchId}
              />

              <DetailField
                label="Academic Year"
                value={section.academicYear}
              />

              <DetailField
                label="Status"
                value={section.status}
              />
            </div>

            {section.description && (
              <div className="mt-4 rounded-xl border border-[#343640] bg-[#191A21] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#D0D0D8]">
                  {section.description}
                </p>
              </div>
            )}
          </SectionCard>

          <div className="mt-5">
            <SectionCard
              eyebrow="ACADEMIC OPERATIONS"
              title="Section Resources"
              description="Academic operations associated with this section will be available as their respective modules are completed."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                  <h3 className="text-sm font-semibold text-[#EAEAE6]">
                    Student Allocation
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                    Student allocation details will appear when the
                    relevant records are connected.
                  </p>
                </div>

                <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                  <h3 className="text-sm font-semibold text-[#EAEAE6]">
                    Mentor Assignment
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                    Mentor assignments will be available through the
                    mentor management module.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="mt-5 flex justify-end">
            <Link
              to="/hod/sections/edit"
              state={{ section }}
            >
              <ActionButton>
                Edit Section Details
              </ActionButton>
            </Link>
          </div>
        </>
      )}

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        This page displays only the section information supplied through
        navigation. Database retrieval and update operations are deferred
        until backend integration.
      </p>
    </div>
  );
}