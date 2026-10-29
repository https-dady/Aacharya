import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const PAGE_SIZE = 100;

function getResponseData(response) {
  const body = response?.data;

  return body?.data ?? body;
}

function getErrorMessage(error) {
  const status = error?.response?.status;

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (status === 403) {
    return 'You are not authorized to view department sections.';
  }

  return (
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.message
    || 'Unable to load section records. Please try again.'
  );
}

function getBatchId(batch) {
  return batch?.id || batch?._id || '';
}

function normalizeSection(section, batch) {
  return {
    ...section,
    id: section.id || section._id,
    batchId: getBatchId(batch),
    batchName: section.batch?.name || batch.name || 'Not available',
    batchCode: section.batch?.code || batch.code || 'Not available',
    academicYear:
      section.batch?.academicYear
      || batch.academicYear
      || 'Not available',
  };
}

async function fetchAllBatches(signal) {
  const batches = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await api.get(
      '/v1/provisioning/batches',
      {
        params: {
          page,
          limit: PAGE_SIZE,
        },
        signal,
      },
    );

    const data = getResponseData(response);

    if (!Array.isArray(data?.batches)) {
      throw new Error(
        'The server returned an unexpected batch list response.',
      );
    }

    batches.push(...data.batches);

    hasNextPage = Boolean(
      data.pagination?.hasNextPage,
    );

    if (!data.pagination && data.batches.length === PAGE_SIZE) {
      page += 1;
      continue;
    }

    if (!hasNextPage) {
      break;
    }

    page += 1;
  }

  return batches;
}

async function fetchSectionsForBatch(batch, signal) {
  const batchId = getBatchId(batch);

  if (!batchId) {
    return [];
  }

  const sections = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await api.get(
      `/v1/provisioning/batches/${encodeURIComponent(batchId)}/sections`,
      {
        params: {
          page,
          limit: PAGE_SIZE,
        },
        signal,
      },
    );

    const data = getResponseData(response);

    if (!Array.isArray(data?.sections)) {
      throw new Error(
        `The server returned an unexpected sections response for batch ${batch.name}.`,
      );
    }

    sections.push(
      ...data.sections.map((section) =>
        normalizeSection(section, batch),
      ),
    );

    hasNextPage = Boolean(
      data.pagination?.hasNextPage,
    );

    if (!data.pagination && data.sections.length === PAGE_SIZE) {
      page += 1;
      continue;
    }

    if (!hasNextPage) {
      break;
    }

    page += 1;
  }

  return sections;
}

export default function SectionList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sections, setSections] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [partialFailureCount, setPartialFailureCount] = useState(0);

  const loadSections = useCallback(async (signal) => {
    setIsLoading(true);
    setError('');
    setPartialFailureCount(0);

    try {
      const batches = await fetchAllBatches(signal);

      if (signal?.aborted) {
        return;
      }

      const results = await Promise.allSettled(
        batches.map((batch) =>
          fetchSectionsForBatch(batch, signal),
        ),
      );

      if (signal?.aborted) {
        return;
      }

      const loadedSections = [];
      let failedBatches = 0;

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          loadedSections.push(...result.value);
        } else {
          if (
            result.reason?.code === 'ERR_CANCELED'
            || signal?.aborted
          ) {
            return;
          }

          failedBatches += 1;
        }
      });

      loadedSections.sort((first, second) => {
        const batchComparison = first.batchName.localeCompare(
          second.batchName,
        );

        if (batchComparison !== 0) {
          return batchComparison;
        }

        return first.code?.localeCompare(second.code || '') || 0;
      });

      setSections(loadedSections);
      setPartialFailureCount(failedBatches);
    } catch (loadError) {
      if (
        signal?.aborted
        || loadError?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setSections([]);
      setError(getErrorMessage(loadError));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadSections(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadSections]);

  const filteredSections = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return sections;
    }

    return sections.filter((section) =>
      [
        section.name,
        section.code,
        section.batchName,
        section.batchCode,
        section.academicYear,
        section.status,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [sections, searchTerm]);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Section Management"
        description="Manage academic sections and review their associated batches."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Section Management',
          },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => loadSections()}
              disabled={isLoading}
              loading={isLoading}
            >
              Refresh
            </ActionButton>

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
        description="Sections are loaded from the backend for the batches belonging to your department."
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-md">
            <SearchInput
              name="sectionSearch"
              label="Search sections"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, code, batch, or year..."
            />
          </div>

          {!isLoading && !error && (
            <p className="text-sm text-[#A5A6B0]">
              {filteredSections.length} of {sections.length} sections
            </p>
          )}
        </div>

        {isLoading ? (
          <LoadingState
            message="Loading department sections..."
            rows={3}
            variant="cards"
          />
        ) : error ? (
          <EmptyState
            title="Unable to load sections"
            description={error}
            action={
              <ActionButton
                type="button"
                onClick={() => loadSections()}
              >
                Try Again
              </ActionButton>
            }
          />
        ) : filteredSections.length === 0 ? (
          <EmptyState
            title={
              searchTerm.trim()
                ? 'No matching sections'
                : 'No sections available yet'
            }
            description={
              searchTerm.trim()
                ? 'Try another section name, code, batch, or academic year.'
                : 'No section records were found for the available batches. You can create a section from the creation form.'
            }
            action={
              searchTerm.trim() ? (
                <ActionButton
                  type="button"
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
          <>
            {partialFailureCount > 0 && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-[#E5DF98]/30 bg-[#E5DF98]/10 p-4"
              >
                <p className="text-sm leading-6 text-[#E5DF98]">
                  Sections loaded, but {partialFailureCount} batch
                  {partialFailureCount === 1 ? '' : 'es'} could not be
                  retrieved. Refresh the page to retry.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredSections.map((section, index) => {
                const sectionId = section.id || section._id;

                const sectionName =
                  section.name || 'Unnamed Section';

                return (
                  <article
                    key={sectionId || `${sectionName}-${index}`}
                    className="rounded-xl border border-[#383943] bg-[#191A21] p-5 transition-colors hover:border-[#555762]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
                          Section {section.code ? `· ${section.code}` : ''}
                        </p>

                        <h3 className="mt-2 break-words text-lg font-semibold text-[#EAEAE6]">
                          {sectionName}
                        </h3>
                      </div>

                      <span
                        className={[
                          'shrink-0 rounded-full border px-2.5 py-1 text-xs',
                          section.status === 'ACTIVE'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : section.status === 'INACTIVE'
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                              : 'border-[#454650] text-[#C8C8D0]',
                        ].join(' ')}
                      >
                        {section.status || 'Unknown'}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div>
                        <p className="text-xs text-[#858590]">
                          Batch
                        </p>

                        <p className="mt-1 break-words text-sm text-[#D0D0D8]">
                          {section.batchName}
                          {section.batchCode !== 'Not available'
                            ? ` (${section.batchCode})`
                            : ''}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#858590]">
                          Academic Year
                        </p>

                        <p className="mt-1 text-sm text-[#D0D0D8]">
                          {section.academicYear}
                        </p>
                      </div>

                      {section.createdAt && (
                        <div>
                          <p className="text-xs text-[#858590]">
                            Created
                          </p>

                          <p className="mt-1 text-sm text-[#D0D0D8]">
                            {new Date(section.createdAt).toLocaleDateString(
                              'en-IN',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              },
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-[#343640] pt-4">
                      <Link
                        to="/hod/sections/details"
                        state={{ section }}
                        className="min-w-0 flex-1"
                      >
                        <ActionButton
                          type="button"
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
                        <ActionButton
                          type="button"
                          fullWidth
                        >
                          Edit Section
                        </ActionButton>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Section records are retrieved through the authenticated,
        department-scoped batch and section endpoints. This page does not
        invent section records or bypass backend access controls.
      </p>
    </div>
  );
}