import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

export default function SectionList() {
  const [searchTerm, setSearchTerm] = useState('');

  // Actual section records will be connected during backend integration.
  const sections = [];

  const filteredSections = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return sections;
    }

    return sections.filter((section) =>
      [
        section.name,
        section.sectionName,
        section.batchName,
        section.academicYear,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [searchTerm]);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Section Management"
        description="Manage academic sections and review their associated batches."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Section Management' },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to="/hod/batches">
              <ActionButton variant="secondary">
                View Batches
              </ActionButton>
            </Link>

            <Link to="/hod/sections/new">
              <ActionButton>
                Create Section
              </ActionButton>
            </Link>
          </div>
        }
      />

      <SectionCard
        eyebrow="SECTION DIRECTORY"
        title="All Sections"
        description="Search available section records by name, batch, or academic year."
      >
        <div className="mb-5 max-w-md">
          <SearchInput
            name="sectionSearch"
            label="Search sections"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by section or batch..."
          />
        </div>

        {filteredSections.length === 0 ? (
          <EmptyState
            title={
              searchTerm.trim()
                ? 'No matching sections'
                : 'No sections available yet'
            }
            description={
              searchTerm.trim()
                ? 'Try another section name, batch name, or academic year.'
                : 'Section records will appear here when actual section data is connected. You can prepare a new section using the creation form.'
            }
            action={
              searchTerm.trim() ? (
                <ActionButton
                  variant="secondary"
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </ActionButton>
              ) : (
                <Link to="/hod/sections/new">
                  <ActionButton>
                    Create Section
                  </ActionButton>
                </Link>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSections.map((section, index) => {
              const sectionId = section.id || section._id;

              const sectionName =
                section.name ||
                section.sectionName ||
                'Unnamed Section';

              return (
                <article
                  key={sectionId || `${sectionName}-${index}`}
                  className="rounded-xl border border-[#383943] bg-[#191A21] p-5 transition-colors hover:border-[#555762]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
                        Academic Section
                      </p>

                      <h3 className="mt-2 break-words text-lg font-semibold text-[#EAEAE6]">
                        {sectionName}
                      </h3>
                    </div>

                    <span className="shrink-0 rounded-full border border-[#454650] px-2.5 py-1 text-xs text-[#C8C8D0]">
                      {section.status || 'Unknown'}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div>
                      <p className="text-xs text-[#858590]">
                        Batch
                      </p>

                      <p className="mt-1 break-words text-sm text-[#D0D0D8]">
                        {section.batchName || 'Not available'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#858590]">
                        Academic Year
                      </p>

                      <p className="mt-1 text-sm text-[#D0D0D8]">
                        {section.academicYear || 'Not available'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-[#343640] pt-4">
                    <Link
                      to="/hod/sections/details"
                      state={{ section }}
                      className="min-w-0 flex-1"
                    >
                      <ActionButton
                        variant="secondary"
                        fullWidth
                      >
                        View Section
                      </ActionButton>
                    </Link>

                    <Link
                      to="/hod/sections/edit"
                      state={{ section }}
                      className="min-w-0 flex-1"
                    >
                      <ActionButton fullWidth>
                        Edit Section
                      </ActionButton>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Section records are not yet connected to the backend. This page
        does not create, modify, or persist section data. The edit action
        passes the selected section to the existing edit page, where
        changes are currently validated locally only.
      </p>
    </div>
  );
}