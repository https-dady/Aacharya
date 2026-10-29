import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useLocation,
} from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const SECTION_PAGE_SIZE = 100;
const BATCH_PAGE_SIZE = 100;

function getResponseData(response) {
  const body = response?.data;

  return body?.data ?? body;
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.message
    || 'Unable to load batch details. Please try again.'
  );
}

function getBatchId(batch) {
  return batch?.id || batch?._id || null;
}

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {value === null || value === undefined || value === ''
          ? 'Not available'
          : value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    INACTIVE:
      'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
  };

  return (
    <span
      className={[
        'inline-flex rounded-full border px-3 py-1.5',
        'text-xs font-medium',
        styles[status]
          || 'border-[#454650] bg-[#292A32] text-[#D0D0D8]',
      ].join(' ')}
    >
      {status || 'Unknown'}
    </span>
  );
}

async function findBatchById(batchId, signal) {
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await api.get(
      '/v1/provisioning/batches',
      {
        params: {
          page,
          limit: BATCH_PAGE_SIZE,
        },
        signal,
      },
    );

    const data = getResponseData(response);

    const batches = Array.isArray(data?.batches)
      ? data.batches
      : [];

    const matchingBatch = batches.find(
      (batch) => getBatchId(batch) === batchId,
    );

    if (matchingBatch) {
      return matchingBatch;
    }

    totalPages = Number(
      data?.pagination?.totalPages ?? 1,
    );

    page += 1;
  }

  return null;
}

export default function BatchDetails() {
  const location = useLocation();

  const initialBatch = location.state?.batch ?? null;
  const initialBatchId = getBatchId(initialBatch);

  const [batch, setBatch] = useState(initialBatch);
  const [sections, setSections] = useState([]);
  const [sectionCount, setSectionCount] = useState(0);
  const [sectionPage, setSectionPage] = useState(1);

  const [isLoadingBatch, setIsLoadingBatch] = useState(
    !initialBatch,
  );

  const [isLoadingSections, setIsLoadingSections] = useState(
    Boolean(initialBatchId),
  );

  const [batchError, setBatchError] = useState('');
  const [sectionError, setSectionError] = useState('');

  const batchId = getBatchId(batch);

  const loadBatch = useCallback(async (signal) => {
    setIsLoadingBatch(true);
    setBatchError('');

    try {
      if (!initialBatchId) {
        setBatch(null);
        setBatchError(
          'A batch ID is required to load this page.',
        );
        return;
      }

      const latestBatch = await findBatchById(
        initialBatchId,
        signal,
      );

      if (signal.aborted) {
        return;
      }

      if (!latestBatch) {
        setBatch(null);
        setBatchError(
          'The batch was not found in your department.',
        );
        return;
      }

      setBatch(latestBatch);
    } catch (error) {
      if (
        signal.aborted
        || error?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setBatchError(getErrorMessage(error));
    } finally {
      if (!signal.aborted) {
        setIsLoadingBatch(false);
      }
    }
  }, [initialBatchId]);

  useEffect(() => {
    if (initialBatchId) {
      return undefined;
    }

    const controller = new AbortController();

    loadBatch(controller.signal);

    return () => {
      controller.abort();
    };
  }, [initialBatchId, loadBatch]);

  const loadSections = useCallback(async (signal) => {
    if (!batchId) {
      setSections([]);
      setSectionCount(0);
      setIsLoadingSections(false);
      return;
    }

    setIsLoadingSections(true);
    setSectionError('');

    try {
      const response = await api.get(
        `/v1/provisioning/batches/${encodeURIComponent(batchId)}/sections`,
        {
          params: {
            page: sectionPage,
            limit: SECTION_PAGE_SIZE,
          },
          signal,
        },
      );

      const data = getResponseData(response);

      if (!Array.isArray(data?.sections)) {
        throw new Error(
          'The server returned an unexpected section list response.',
        );
      }

      if (signal.aborted) {
        return;
      }

      setSections(data.sections);

      setSectionCount(
        Number(data?.pagination?.total ?? data.sections.length),
      );

      if (data.batch) {
        setBatch((currentBatch) => ({
          ...currentBatch,
          ...data.batch,
        }));
      }
    } catch (error) {
      if (
        signal.aborted
        || error?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setSections([]);
      setSectionCount(0);
      setSectionError(getErrorMessage(error));
    } finally {
      if (!signal.aborted) {
        setIsLoadingSections(false);
      }
    }
  }, [batchId, sectionPage]);

  useEffect(() => {
    const controller = new AbortController();

    loadSections(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadSections]);

  const pageError = batchError || '';

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Batch Details"
        description="Review academic batch information and manage its sections."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Batch Management',
            to: '/hod/batches',
          },
          {
            label: 'Batch Details',
          },
        ]}
        actions={
          <Link to="/hod/batches">
            <ActionButton variant="secondary">
              Back to Batches
            </ActionButton>
          </Link>
        }
      />

      {isLoadingBatch && !batch && (
        <SectionCard
          eyebrow="ACADEMIC STRUCTURE"
          title="Loading batch"
          description="Retrieving the batch record from the backend."
        >
          <LoadingState
            message="Loading batch details..."
          />
        </SectionCard>
      )}

      {pageError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
        >
          <p className="text-sm leading-6 text-rose-200">
            {pageError}
          </p>

          {initialBatchId && (
            <div className="mt-3">
              <ActionButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const controller = new AbortController();

                  loadBatch(controller.signal);
                }}
              >
                Retry
              </ActionButton>
            </div>
          )}
        </div>
      )}

      {!isLoadingBatch && !batch && !pageError && (
        <EmptyState
          title="Batch record unavailable"
          description="The batch could not be found. Return to the batch directory and select an available record."
          action={
            <Link to="/hod/batches">
              <ActionButton variant="secondary">
                Return to Batch Directory
              </ActionButton>
            </Link>
          }
        />
      )}

      {batch && (
        <>
          <SectionCard
            eyebrow="ACADEMIC STRUCTURE"
            title={batch.name || 'Academic Batch'}
            description="Actual batch information retrieved from the backend."
            action={
              <StatusBadge status={batch.status} />
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField
                label="Batch Name"
                value={batch.name}
              />

              <DetailField
                label="Batch Code"
                value={batch.code}
              />

              <DetailField
                label="Academic Year"
                value={batch.academicYear}
              />

              <DetailField
                label="Batch ID"
                value={getBatchId(batch)}
              />

              <DetailField
                label="Total Sections"
                value={
                  isLoadingSections
                    ? 'Loading...'
                    : sectionError
                      ? 'Unavailable'
                      : sectionCount
                }
              />

              <DetailField
                label="Department"
                value={
                  batch.department?.name
                  || batch.departmentName
                }
              />
            </div>

            {batch.createdAt && (
              <div className="mt-4">
                <DetailField
                  label="Created At"
                  value={new Date(
                    batch.createdAt,
                  ).toLocaleString()}
                />
              </div>
            )}
          </SectionCard>

          <div className="mt-5">
            <SectionCard
              eyebrow="SECTION MANAGEMENT"
              title="Batch Sections"
              description="View the actual sections associated with this academic batch."
              action={
                <Link
                  to="/hod/sections/new"
                  state={{
                    batchId,
                    batchName: batch.name,
                    academicYear: batch.academicYear,
                  }}
                >
                  <ActionButton size="sm">
                    Create Section
                  </ActionButton>
                </Link>
              }
            >
              {sectionError && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
                >
                  <p className="text-sm leading-6 text-rose-200">
                    {sectionError}
                  </p>

                  <div className="mt-3">
                    <ActionButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const controller = new AbortController();

                        loadSections(controller.signal);
                      }}
                    >
                      Retry Sections
                    </ActionButton>
                  </div>
                </div>
              )}

              {isLoadingSections && sections.length === 0 ? (
                <LoadingState
                  message="Loading batch sections..."
                />
              ) : sectionError ? (
                <EmptyState
                  title="Sections unavailable"
                  description="The batch information is available, but its sections could not be loaded."
                />
              ) : sections.length === 0 ? (
                <EmptyState
                  title="No sections found"
                  description="This batch does not have any section records yet. Create a section to get started."
                  action={
                    <Link
                      to="/hod/sections/new"
                      state={{
                        batchId,
                        batchName: batch.name,
                        academicYear: batch.academicYear,
                      }}
                    >
                      <ActionButton>
                        Create Section
                      </ActionButton>
                    </Link>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sections.map((section, index) => {
                    const sectionId = (
                      section.id || section._id
                    );

                    return (
                      <article
                        key={
                          sectionId
                          || `${section.code}-${index}`
                        }
                        className="rounded-xl border border-[#383943] bg-[#191A21] p-4 transition-colors hover:border-[#555762]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
                              Academic Section
                            </p>

                            <h3 className="mt-2 break-words text-base font-semibold text-[#EAEAE6]">
                              {section.name || 'Unnamed Section'}
                            </h3>

                            <p className="mt-1 break-words text-sm text-[#A5A6B0]">
                              Code: {section.code || '—'}
                            </p>
                          </div>

                          <StatusBadge
                            status={section.status}
                          />
                        </div>

                        <div className="mt-4 border-t border-[#343640] pt-4">
                          <DetailField
                            label="Academic Year"
                            value={
                              section.academicYear
                              || batch.academicYear
                            }
                          />
                        </div>

                        <div className="mt-4">
                          <Link
                            to="/hod/sections/details"
                            state={{
                              section: {
                                ...section,
                                batchName: batch.name,
                                academicYear: batch.academicYear,
                              },
                            }}
                          >
                            <ActionButton
                              variant="secondary"
                              fullWidth
                            >
                              View Section
                            </ActionButton>
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {!sectionError && sectionCount > SECTION_PAGE_SIZE && (
                <div className="mt-5 flex items-center justify-between border-t border-[#343640] pt-4">
                  <p className="text-sm text-[#A5A6B0]">
                    Page {sectionPage} · {sectionCount} total sections
                  </p>

                  <div className="flex gap-2">
                    <ActionButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={
                        isLoadingSections
                        || sectionPage <= 1
                      }
                      onClick={() => {
                        setSectionPage((current) =>
                          Math.max(1, current - 1),
                        );
                      }}
                    >
                      Previous
                    </ActionButton>

                    <ActionButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={
                        isLoadingSections
                        || sectionPage * SECTION_PAGE_SIZE >= sectionCount
                      }
                      onClick={() => {
                        setSectionPage((current) => current + 1);
                      }}
                    >
                      Next
                    </ActionButton>
                  </div>
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
        Batch and section information is retrieved through the existing
        authenticated backend APIs. Department-level access restrictions
        remain enforced by the server.
      </p>
    </div>
  );
}