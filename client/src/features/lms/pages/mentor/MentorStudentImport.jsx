import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import mentorDashboardService from '../../services/mentorDashboardService.js';

import mentorStudentImportService from '../../services/mentorStudentImportService.js';

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_PREVIEW_ROWS = 15;

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Something went wrong. Please try again.'
  );
}

function DownloadIcon() {
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
        d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-6 w-6"
    >
      <path
        d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  description,
}) {
  return (
    <article className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-4">
      <p className="text-sm text-[#A5A6B0]">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[#858590]">
        {description}
      </p>
    </article>
  );
}

function StatusBadge({ status }) {
  const styles = {
    READY: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    CONFLICT: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  };

  return (
    <span
      className={[
        'inline-flex rounded-full border px-2.5 py-1',
        'text-xs font-semibold',
        styles[status] || styles.CONFLICT,
      ].join(' ')}
    >
      {status}
    </span>
  );
}

function Feedback({
  error,
  success,
}) {
  if (!error && !success) {
    return null;
  }

  return (
    <div
      role={error ? 'alert' : 'status'}
      aria-live="polite"
      className={[
        'rounded-xl border px-4 py-3 text-sm leading-6',
        error
          ? 'border-rose-400/20 bg-rose-400/[0.06] text-rose-300'
          : 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300',
      ].join(' ')}
    >
      {error || success}
    </div>
  );
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-4"
    >
      <span className="sr-only">
        Loading mentor assignments.
      </span>

      {[1, 2].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-xl border border-[#343640] bg-[#1D1F27] p-5"
        >
          <div className="h-4 w-40 rounded bg-[#343640]" />

          <div className="mt-4 h-10 w-full rounded bg-[#343640]" />
        </div>
      ))}
    </div>
  );
}

function generateIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (!globalThis.crypto?.getRandomValues) {
    throw new Error(
      'Secure random generation is unavailable in this browser.',
    );
  }

  const bytes = new Uint8Array(32);

  globalThis.crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function downloadTextFile(content, filename) {
  const blob = new Blob(
    ['\uFEFF', content],
    {
      type: 'text/csv;charset=utf-8;',
    },
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export default function MentorStudentImport() {
  const fileInputRef = useRef(null);

  const previewControllerRef = useRef(null);
  const importControllerRef = useRef(null);

  const [sections, setSections] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  const [selectedSectionId, setSelectedSectionId] = useState('');

  const [file, setFile] = useState(null);
  const [csvContent, setCsvContent] = useState('');

  const [preview, setPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [templateError, setTemplateError] = useState('');

  const [idempotencyKey, setIdempotencyKey] = useState('');

  const loadAssignments = useCallback(async (signal) => {
    setLoadingAssignments(true);
    setError('');

    try {
      const dashboard = await mentorDashboardService.getDashboard({
        signal,
      });

      if (signal.aborted) {
        return;
      }

      const assignedSections = dashboard.assignments.sections;

      setSections(assignedSections);

      setSelectedSectionId((current) => {
        if (
          current
          && assignedSections.some((section) => section.id === current)
        ) {
          return current;
        }

        return assignedSections[0]?.id ?? '';
      });
    } catch (requestError) {
      if (
        signal.aborted
        || requestError?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setError(getErrorMessage(requestError));
    } finally {
      if (!signal.aborted) {
        setLoadingAssignments(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadAssignments(controller.signal);

    return () => {
      controller.abort();
      previewControllerRef.current?.abort();
      importControllerRef.current?.abort();
    };
  }, [loadAssignments]);

  const selectedSection = sections.find(
    (section) => section.id === selectedSectionId,
  );

  const summary = useMemo(() => {
    if (!preview) {
      return {
        total: 0,
        ready: 0,
        conflicts: 0,
      };
    }

    return {
      total: preview.summary.totalRows,
      ready: preview.summary.readyCount,
      conflicts: preview.summary.conflictCount,
    };
  }, [preview]);

  const previewRows = preview?.rows.slice(
    0,
    MAX_PREVIEW_ROWS,
  ) ?? [];

  const canImport = Boolean(
    preview?.summary.canImport
    && preview.summary.readyCount > 0
    && !preview.summary.conflictCount
    && !importing
    && !importResult,
  );

  function invalidatePreview() {
    previewControllerRef.current?.abort();

    setPreview(null);
    setImportResult(null);
    setIdempotencyKey('');

    setError('');
    setSuccess('');
  }

  async function handleTemplateDownload() {
    setDownloadingTemplate(true);
    setTemplateError('');

    try {
      const content =
        await mentorStudentImportService.downloadTemplate();

      downloadTextFile(
        content,
        'aacharya-student-import-template.csv',
      );
    } catch (requestError) {
      setTemplateError(getErrorMessage(requestError));
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];

    invalidatePreview();

    setFile(null);
    setCsvContent('');
    setFileError('');
    setSuccess('');

    if (!selectedFile) {
      return;
    }

    const extension = selectedFile.name
      .split('.')
      .pop()
      ?.toLowerCase();

    if (!['csv', 'xlsx'].includes(extension)) {
      setFileError('Choose a valid CSV or XLSX file.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size === 0) {
      setFileError('The selected file is empty.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError('File size must not exceed 1 MB.');
      event.target.value = '';
      return;
    }

    try {
      let content = '';

      if (extension === 'csv') {
        content = await selectedFile.text();

        if (!content.trim()) {
          throw new Error('The CSV file contains no data.');
        }
      }

      setFile(selectedFile);
      setCsvContent(content);
    } catch (readError) {
      setFileError(getErrorMessage(readError));
      event.target.value = '';
    }
  }

  function clearFile() {
    invalidatePreview();

    setFile(null);
    setCsvContent('');
    setFileError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handlePreview() {
    if (!file || !selectedSectionId || loadingPreview) {
      return;
    }

    previewControllerRef.current?.abort();

    const controller = new AbortController();

    previewControllerRef.current = controller;

    setLoadingPreview(true);
    setError('');
    setSuccess('');
    setPreview(null);
    setImportResult(null);
    setIdempotencyKey('');

    try {
      const result = await mentorStudentImportService.preview({
        sectionId: selectedSectionId,
        file,
        csvContent,
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      setPreview(result);

      if (result.summary.canImport) {
        setSuccess(
          'Server-side validation completed. All student records are ready for import.',
        );
      }
    } catch (requestError) {
      if (
        requestError?.code !== 'ERR_CANCELED'
        && !controller.signal.aborted
      ) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoadingPreview(false);
      }
    }
  }

  async function handleImport() {
    if (!canImport || !file || !selectedSectionId) {
      return;
    }

    let requestKey = idempotencyKey;

    try {
      if (!requestKey) {
        requestKey = generateIdempotencyKey();
        setIdempotencyKey(requestKey);
      }
    } catch (keyError) {
      setError(getErrorMessage(keyError));
      return;
    }

    const controller = new AbortController();

    importControllerRef.current = controller;

    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const result =
        await mentorStudentImportService.importStudents({
          sectionId: selectedSectionId,
          file,
          csvContent,
          idempotencyKey: requestKey,
          signal: controller.signal,
        });

      if (controller.signal.aborted) {
        return;
      }

      setImportResult(result.data);

      setSuccess(
        result.message
        || 'Student import completed successfully.',
      );
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(getErrorMessage(requestError));

        /*
         * Keep the same idempotency key after a failed or
         * uncertain response. A retry of the same file must
         * reuse the same key to avoid duplicate creation.
         */
      }
    } finally {
      if (!controller.signal.aborted) {
        setImporting(false);
      }
    }
  }

  const sectionOptions = sections.map((section) => ({
    id: section.id,
    label: `${section.name} (${section.code})`,
    batch: section.batch?.name || 'Assigned batch',
  }));

  if (loadingAssignments) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PageHeader
          eyebrow="MENTOR WORKSPACE"
          title="Bulk Student Import"
          description="Import student accounts into your assigned academic sections."
        />

        <LoadingState />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="MENTOR WORKSPACE"
        title="Bulk Student Import"
        description="Upload student records, validate them against institutional data and import them into an assigned section."
        breadcrumbs={[
          {
            label: 'Mentor',
            to: '/mentor/dashboard',
          },
          {
            label: 'Assigned Students',
            to: '/mentor/students',
          },
          {
            label: 'Bulk Import',
          },
        ]}
        actions={
          <Link
            to="/mentor/students"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139]"
          >
            Back to students
          </Link>
        }
      />

      <Feedback
        error={error}
        success={success}
      />

      {sections.length === 0 ? (
        <EmptyState
          title="No assigned sections available"
          description="You need an active section assignment before importing students. Contact your HOD to verify your mentor assignments."
          className="border-0 bg-transparent py-12"
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label="Total records"
              value={summary.total}
              description="Records validated by the backend."
            />

            <MetricCard
              label="Ready to import"
              value={summary.ready}
              description="Records without existing ID or email conflicts."
            />

            <MetricCard
              label="Conflicts"
              value={summary.conflicts}
              description="Records requiring correction."
            />
          </section>

          <SectionCard
            eyebrow="Step 1"
            title="Choose assigned section"
            description="Students will be created only inside the selected section."
          >
            <div className="max-w-2xl">
              <label
                htmlFor="mentor-import-section"
                className="mb-2 block text-sm font-medium text-[#D6D6DF]"
              >
                Assigned section
              </label>

              <select
                id="mentor-import-section"
                value={selectedSectionId}
                onChange={(event) => {
                  invalidatePreview();
                  setSelectedSectionId(event.target.value);
                }}
                disabled={importing}
                className="min-h-12 w-full rounded-xl border border-[#3B3C43] bg-[#14161C] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
              >
                {sectionOptions.map((section) => (
                  <option
                    key={section.id}
                    value={section.id}
                  >
                    {section.label} — {section.batch}
                  </option>
                ))}
              </select>

              {selectedSection && (
                <p className="mt-3 text-xs text-[#858590]">
                  Selected batch: {selectedSection.batch?.name}
                  {' · '}
                  {selectedSection.batch?.academicYear}
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Step 2"
            title="Download official template"
            description="Use the exact schema generated by the backend. This template is compatible with CSV import."
            action={
              <button
                type="button"
                onClick={handleTemplateDownload}
                disabled={downloadingTemplate}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#CDB5F7]/25 bg-[#CDB5F7]/10 px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition hover:bg-[#CDB5F7]/15 disabled:opacity-50"
              >
                <DownloadIcon />

                {downloadingTemplate
                  ? 'Downloading...'
                  : 'Download CSV template'}
              </button>
            }
          >
            <div className="flex flex-wrap gap-2">
              {[
                'institutionalId',
                'fullName',
                'password',
                'email (optional)',
              ].map((header) => (
                <span
                  key={header}
                  className="rounded-lg border border-[#343640] bg-[#17181F] px-3 py-2 font-mono text-xs text-[#D6D6DF]"
                >
                  {header}
                </span>
              ))}
            </div>

            {templateError && (
              <div
                role="alert"
                className="mt-4 text-sm text-rose-300"
              >
                {templateError}
              </div>
            )}

            <div className="mt-5 rounded-xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-4">
              <p className="text-sm font-semibold text-[#E5DF98]">
                Important credential security
              </p>

              <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
                The backend requires an initial password for every
                imported student. Use unique temporary credentials,
                distribute them securely and do not reuse existing
                personal passwords. The server stores password hashes,
                not plaintext passwords. Imported accounts remain
                unactivated until the existing student activation
                workflow is completed.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Step 3"
            title="Upload student file"
            description="CSV and XLSX files are parsed and validated by the backend. Maximum size is 1 MB and maximum records per import is 500."
          >
            <input
              ref={fileInputRef}
              id="mentor-import-file"
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              disabled={importing}
              className="sr-only"
            />

            <label
              htmlFor="mentor-import-file"
              className={[
                'flex cursor-pointer flex-col items-center justify-center',
                'rounded-2xl border border-dashed border-[#555662]',
                'bg-[#17181F] px-5 py-10 text-center transition-colors',
                'hover:border-[#CDB5F7]/60 hover:bg-[#CDB5F7]/[0.03]',
                'focus-within:ring-2 focus-within:ring-[#CDB5F7]',
              ].join(' ')}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]">
                <UploadIcon />
              </span>

              <span className="mt-4 text-sm font-semibold text-[#EAEAE6]">
                Choose CSV or XLSX file
              </span>

              <span className="mt-2 text-xs text-[#858590]">
                Maximum 1 MB · Maximum 500 students
              </span>
            </label>

            {file && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#343640] bg-[#17181F] p-4">
                <div className="min-w-0">
                  <p className="break-all text-sm font-medium text-[#EAEAE6]">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-[#858590]">
                    {(file.size / 1024).toFixed(1)} KB
                    {' · '}
                    {file.name.split('.').pop()?.toUpperCase()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearFile}
                  disabled={importing}
                  className="rounded-lg border border-[#454650] px-3 py-2 text-xs font-semibold text-[#D6D6DF] hover:bg-[#26272B] disabled:opacity-50"
                >
                  Remove file
                </button>
              </div>
            )}

            {fileError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-300"
              >
                {fileError}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!file || !selectedSectionId || loadingPreview || importing}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#CDB5F7] px-5 py-2.5 text-sm font-semibold text-[#191621] transition hover:bg-[#DCCBFA] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingPreview
                  ? 'Validating with server...'
                  : 'Validate & Preview'}
              </button>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Step 4"
            title="Server validation results"
            description="The backend verifies institutional IDs, email uniqueness, file structure and import eligibility."
          >
            {!preview ? (
              <EmptyState
                title="No server preview available"
                description="Select an assigned section, upload a file and click Validate & Preview."
                className="border-0 bg-transparent py-10"
              />
            ) : (
              <>
                <div className="mb-5 flex flex-wrap gap-3">
                  <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                    {summary.ready} ready
                  </span>

                  <span className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-300">
                    {summary.conflicts} conflicts
                  </span>
                </div>

                <div className="mb-5 rounded-xl border border-[#343640] bg-[#17181F] p-4">
                  <p className="text-sm font-semibold text-[#EAEAE6]">
                    Validated academic destination
                  </p>

                  <p className="mt-2 text-sm text-[#B8B8C2]">
                    {preview.batch?.name}
                    {' · '}
                    {preview.section?.name}
                  </p>

                  <p className="mt-1 text-xs text-[#858590]">
                    {preview.batch?.academicYear}
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#343640]">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-[#17181F] text-xs uppercase tracking-wide text-[#858590]">
                      <tr>
                        <th className="px-4 py-3">Row</th>
                        <th className="px-4 py-3">Institutional ID</th>
                        <th className="px-4 py-3">Full Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#343640]">
                      {previewRows.map((row) => (
                        <tr
                          key={row.row}
                          className="align-top hover:bg-[#26272B]/40"
                        >
                          <td className="px-4 py-4 text-[#858590]">
                            {row.row}
                          </td>

                          <td className="px-4 py-4 text-[#D6D6DF]">
                            {row.institutionalId}
                          </td>

                          <td className="px-4 py-4 text-[#EAEAE6]">
                            {row.fullName}
                          </td>

                          <td className="px-4 py-4 text-[#B8B8C2]">
                            {row.email || '—'}
                          </td>

                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <StatusBadge status={row.status} />

                              {row.conflicts.map((conflict, index) => (
                                <p
                                  key={`${conflict.code}-${index}`}
                                  className="max-w-xs text-xs leading-5 text-rose-300"
                                >
                                  {conflict.message}
                                </p>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {preview.rows.length > MAX_PREVIEW_ROWS && (
                  <p className="mt-4 text-xs text-[#858590]">
                    Showing {MAX_PREVIEW_ROWS} of {preview.rows.length} rows.
                    All rows were validated by the backend.
                  </p>
                )}

                {!preview.summary.canImport && (
                  <div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4">
                    <p className="text-sm font-semibold text-rose-300">
                      Import is blocked
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
                      Resolve all conflicts and generate a fresh
                      server preview before importing.
                    </p>
                  </div>
                )}
              </>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Step 5"
            title="Import student accounts"
            description="Accounts are created transactionally and protected against duplicate retries."
          >
            {importResult ? (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
                <p className="text-lg font-bold text-emerald-300">
                  Import completed successfully
                </p>

                <p className="mt-2 text-sm text-[#B8B8C2]">
                  {importResult.importedCount} student accounts were created.
                </p>

                <div className="mt-5 overflow-x-auto rounded-xl border border-[#343640]">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="bg-[#17181F] text-xs text-[#858590]">
                      <tr>
                        <th className="px-4 py-3">Student ID</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Email</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#343640]">
                      {importResult.students.map((student) => (
                        <tr key={student.id}>
                          <td className="px-4 py-3 text-[#D6D6DF]">
                            {student.institutionalId}
                          </td>

                          <td className="px-4 py-3 text-[#EAEAE6]">
                            {student.fullName}
                          </td>

                          <td className="px-4 py-3 text-[#B8B8C2]">
                            {student.email || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Link
                  to="/mentor/students"
                  className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#191621]"
                >
                  View assigned students
                </Link>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
                  <p className="text-sm font-semibold text-[#EAEAE6]">
                    Import summary
                  </p>

                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-[#A5A6B0]">
                        Records reviewed
                      </span>

                      <span className="font-semibold text-[#EAEAE6]">
                        {summary.total}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-[#A5A6B0]">
                        Ready records
                      </span>

                      <span className="font-semibold text-emerald-300">
                        {summary.ready}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-[#A5A6B0]">
                        Conflicting records
                      </span>

                      <span className="font-semibold text-rose-300">
                        {summary.conflicts}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={clearFile}
                    disabled={!file || importing}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition hover:bg-[#26272B] disabled:opacity-40"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!canImport}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#CDB5F7] px-5 py-2.5 text-sm font-semibold text-[#191621] transition hover:bg-[#DCCBFA] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {importing
                      ? 'Importing students...'
                      : `Import ${summary.ready} students`}
                  </button>
                </div>
              </>
            )}
          </SectionCard>
        </>
      )}

      <div className="rounded-2xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-5">
        <h3 className="text-sm font-semibold text-[#E5DF98]">
          Security and data integrity
        </h3>

        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#B8B8C2]">
          <li>
            Only active sections assigned to your Mentor account
            are eligible.
          </li>

          <li>
            The backend independently validates all uploaded records.
          </li>

          <li>
            Duplicate institutional IDs and email addresses are rejected.
          </li>

          <li>
            Passwords are hashed before database insertion.
          </li>

          <li>
            Student creation and import history are committed
            transactionally.
          </li>

          <li>
            Idempotency keys protect retries against duplicate imports.
          </li>

          <li>
            Imported student accounts require activation.
          </li>
        </ul>
      </div>
    </div>
  );
}