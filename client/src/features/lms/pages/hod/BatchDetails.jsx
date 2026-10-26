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

export default function BatchDetails() {
  const location = useLocation();
  const batch = location.state?.batch ?? null;

  const sections = Array.isArray(batch?.sections)
    ? batch.sections
    : [];

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Batch Details"
        description="Review academic batch information and access its section management workspace."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Batch Management', to: '/hod/batches' },
          { label: 'Batch Details' },
        ]}
        actions={
          <Link to="/hod/batches">
            <ActionButton variant="secondary">
              Back to Batches
            </ActionButton>
          </Link>
        }
      />

      {!batch ? (
        <EmptyState
          title="Batch record unavailable"
          description="No batch record was provided to this page. Open a batch from the directory once actual records are available."
          action={
            <Link to="/hod/batches">
              <ActionButton variant="secondary">
                Return to Batch Directory
              </ActionButton>
            </Link>
          }
        />
      ) : (
        <>
          <SectionCard
            eyebrow="ACADEMIC STRUCTURE"
            title={batch.name || 'Academic Batch'}
            description="Basic information for this academic batch."
            action={
              <span className="inline-flex rounded-full border border-[#454650] bg-[#292A32] px-3 py-1.5 text-xs font-medium text-[#D0D0D8]">
                {batch.status || 'Status unavailable'}
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField
                label="Batch Name"
                value={batch.name}
              />

              <DetailField
                label="Academic Year"
                value={batch.academicYear}
              />

              <DetailField
                label="Batch ID"
                value={batch.id || batch._id}
              />

              <DetailField
                label="Number of Sections"
                value={
                  Array.isArray(batch.sections)
                    ? String(batch.sections.length)
                    : 'Not available'
                }
              />
            </div>

            {batch.description && (
              <div className="mt-4 rounded-xl border border-[#343640] bg-[#191A21] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#D0D0D8]">
                  {batch.description}
                </p>
              </div>
            )}
          </SectionCard>

          <div className="mt-5">
            <SectionCard
              eyebrow="SECTION MANAGEMENT"
              title="Batch Sections"
              description="Review sections associated with this batch."
              action={
                <Link
                  to="/hod/sections/new"
                  state={{
                    batchId: batch.id || batch._id,
                    batchName: batch.name,
                  }}
                >
                  <ActionButton size="sm">
                    Create Section
                  </ActionButton>
                </Link>
              }
            >
              {sections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#454650] bg-[#191A21] px-5 py-8 text-center">
                  <h3 className="text-sm font-semibold text-[#EAEAE6]">
                    No section records available
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#A5A6B0]">
                    Sections will appear here when the batch's actual
                    section records are connected.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sections.map((section, index) => {
                    const sectionId = section.id || section._id;

                    return (
                      <div
                        key={sectionId || `${section.name}-${index}`}
                        className="rounded-xl border border-[#383943] bg-[#191A21] p-4"
                      >
                        <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
                          Section
                        </p>

                        <h3 className="mt-2 text-base font-semibold text-[#EAEAE6]">
                          {section.name ||
                            section.sectionName ||
                            'Unnamed Section'}
                        </h3>

                        {sectionId && (
                          <p className="mt-2 break-all text-xs text-[#858590]">
                            ID: {sectionId}
                          </p>
                        )}

                        <div className="mt-4">
                          <Link
                            to="/hod/sections/details"
                            state={{ section }}
                          >
                            <ActionButton
                              variant="secondary"
                              fullWidth
                            >
                              View Section
                            </ActionButton>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="mt-5 flex justify-end">
            <Link to="/hod/batches">
              <ActionButton variant="secondary">
                Back to Batches
              </ActionButton>
            </Link>
          </div>
        </>
      )}

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        This page displays only the batch information supplied to it.
        Database loading and save operations will be connected during
        the backend integration phase.
      </p>
    </div>
  );
}