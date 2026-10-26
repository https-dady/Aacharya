import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const TEMPLATE_HEADERS = [
  'studentId',
  'name',
  'email',
  'batch',
  'section',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PREVIEW_ROWS = 10;

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

function StatusBadge({ status }) {
  const styles = {
    valid: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    invalid: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
    pending: 'border-[#E5DF98]/20 bg-[#E5DF98]/10 text-[#E5DF98]',
  };

  return (
    <span
      className={[
        'inline-flex rounded-full border px-2.5 py-1',
        'text-xs font-semibold capitalize',
        styles[status] || styles.pending,
      ].join(' ')}
    >
      {status}
    </span>
  );
}

function MetricCard({ label, value, description }) {
  return (
    <article className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-4">
      <p className="text-sm text-[#A5A6B0]">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#EAEAE6]">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#858590]">{description}</p>
    </article>
  );
}

function parseCSVLine(line) {
  const values = [];
  let value = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === ',' && !insideQuotes) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }

  if (insideQuotes) {
    throw new Error('The CSV contains an unclosed quoted field.');
  }

  values.push(value.trim());

  return values;
}

function parseCSV(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('The CSV must contain a header and at least one student row.');
  }

  const headers = parseCSVLine(lines[0]).map((header) =>
    header.trim(),
  );

  const normalizedHeaders = headers.map((header) =>
    header.toLowerCase(),
  );

  const requiredHeaders = TEMPLATE_HEADERS;

  const missingHeaders = requiredHeaders.filter(
    (header) => !normalizedHeaders.includes(header.toLowerCase()),
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required columns: ${missingHeaders.join(', ')}.`,
    );
  }

  const indexes = Object.fromEntries(
    requiredHeaders.map((header) => [
      header,
      normalizedHeaders.indexOf(header.toLowerCase()),
    ]),
  );

  return lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line);

    if (values.length !== headers.length) {
      return {
        rowNumber: index + 2,
        studentId: '',
        name: '',
        email: '',
        batch: '',
        section: '',
        errors: ['Column count does not match the header.'],
      };
    }

    return {
      rowNumber: index + 2,
      studentId: values[indexes.studentId] || '',
      name: values[indexes.name] || '',
      email: values[indexes.email] || '',
      batch: values[indexes.batch] || '',
      section: values[indexes.section] || '',
      errors: [],
    };
  });
}

function validateRows(rows) {
  const seenStudentIds = new Set();
  const seenEmails = new Set();

  return rows.map((row) => {
    const errors = [...row.errors];

    if (!row.studentId.trim()) {
      errors.push('Student ID is required.');
    }

    if (!row.name.trim()) {
      errors.push('Student name is required.');
    }

    if (!row.email.trim()) {
      errors.push('Email is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
      errors.push('Email format is invalid.');
    }

    if (!row.batch.trim()) {
      errors.push('Batch is required.');
    }

    if (!row.section.trim()) {
      errors.push('Section is required.');
    }

    const normalizedId = row.studentId.trim().toLowerCase();
    const normalizedEmail = row.email.trim().toLowerCase();

    if (normalizedId && seenStudentIds.has(normalizedId)) {
      errors.push('Duplicate student ID in this file.');
    }

    if (normalizedEmail && seenEmails.has(normalizedEmail)) {
      errors.push('Duplicate email in this file.');
    }

    if (normalizedId) {
      seenStudentIds.add(normalizedId);
    }

    if (normalizedEmail) {
      seenEmails.add(normalizedEmail);
    }

    return {
      ...row,
      errors,
      status: errors.length === 0 ? 'valid' : 'invalid',
    };
  });
}

function downloadCSVTemplate() {
  const example = [
    TEMPLATE_HEADERS.join(','),
    'STU001,Example Student,student@example.com,Batch-A,Section-A',
  ].join('\r\n');

  const blob = new Blob(['\uFEFF', example], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = 'aacharya-student-import-template.csv';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function MentorStudentImport() {
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [fileError, setFileError] = useState('');
  const [isReading, setIsReading] = useState(false);

  const summary = useMemo(() => {
    const valid = rows.filter((row) => row.status === 'valid').length;
    const invalid = rows.filter((row) => row.status === 'invalid').length;

    return {
      total: rows.length,
      valid,
      invalid,
    };
  }, [rows]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    setFileError('');
    setRows([]);
    setFileName('');

    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!['csv', 'xlsx'].includes(extension)) {
      setFileError('Choose a CSV or XLSX file.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('File size must not exceed 5 MB.');
      event.target.value = '';
      return;
    }

    setFileName(file.name);

    if (extension === 'xlsx') {
      setFileError(
        'XLSX preview requires an approved spreadsheet parser. CSV preview is available now; XLSX import is not enabled yet.',
      );
      return;
    }

    setIsReading(true);

    try {
      const text = await file.text();
      const parsedRows = parseCSV(text);
      setRows(validateRows(parsedRows));
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : 'Unable to read this file.',
      );
    } finally {
      setIsReading(false);
    }
  }

  function clearFile() {
    setFileName('');
    setRows([]);
    setFileError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Mentor workspace"
        title="Bulk Student Import"
        description="Prepare student records in bulk, review validation errors and check the import summary before backend import integration."
        breadcrumbs={[
          { label: 'Mentor', to: '/mentor/dashboard' },
          { label: 'Assigned Students', to: '/mentor/students' },
          { label: 'Bulk Import' },
        ]}
        actions={
          <Link
            to="/mentor/students"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Back to students
          </Link>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total rows"
          value={summary.total}
          description="Student rows detected in the selected CSV"
        />

        <MetricCard
          label="Valid rows"
          value={summary.valid}
          description="Passed local format and required-field checks"
        />

        <MetricCard
          label="Rows with errors"
          value={summary.invalid}
          description="Require correction before import"
        />

        <MetricCard
          label="Import status"
          value="Pending"
          description="Actual database import is not connected"
        />
      </section>

      <SectionCard
        eyebrow="Step 1"
        title="Download the template"
        description="Use the expected column names so the CSV can be previewed correctly."
        action={
          <button
            type="button"
            onClick={downloadCSVTemplate}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#CDB5F7]/25 bg-[#CDB5F7]/10 px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            <DownloadIcon />
            Download CSV template
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_HEADERS.map((header) => (
            <span
              key={header}
              className="rounded-lg border border-[#343640] bg-[#17181F] px-3 py-2 font-mono text-xs text-[#D6D6DF]"
            >
              {header}
            </span>
          ))}
        </div>

        <p className="mt-4 text-sm leading-6 text-[#858590]">
          Required columns: studentId, name, email, batch and section.
          Batch and section membership must be checked against the
          authenticated mentor's actual assignments on the server.
        </p>
      </SectionCard>

      <SectionCard
        eyebrow="Step 2"
        title="Select a student file"
        description="CSV files can be previewed locally. XLSX preview and database import are not enabled yet."
      >
        <input
          ref={fileInputRef}
          id="mentor-import-file"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFileChange}
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

          <span className="mt-2 text-xs leading-5 text-[#858590]">
            Maximum file size: 5 MB
          </span>
        </label>

        {fileName && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#343640] bg-[#17181F] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="break-all text-sm font-medium text-[#EAEAE6]">
                {fileName}
              </p>
              <p className="mt-1 text-xs text-[#858590]">
                {rows.length > 0
                  ? `${rows.length} student rows detected`
                  : 'Selected file'}
              </p>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="inline-flex min-h-9 items-center justify-center self-start rounded-lg border border-[#3B3C43] px-3 py-2 text-xs font-semibold text-[#D6D6DF] transition-colors hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] sm:self-auto"
            >
              Remove file
            </button>
          </div>
        )}

        {isReading && (
          <p className="mt-4 text-sm text-[#CDB5F7]" role="status">
            Reading and validating CSV…
          </p>
        )}

        {fileError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm leading-6 text-rose-300"
          >
            {fileError}
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Step 3"
        title="Preview and validation"
        description="Review the parsed rows and fix errors in the source file before continuing."
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No student rows to preview"
            description="Download the CSV template and select a populated CSV file to see the student preview and validation results."
            className="border-0 bg-transparent py-10"
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-3 text-xs">
              <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-300">
                {summary.valid} valid
              </span>

              <span className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-rose-300">
                {summary.invalid} invalid
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#17181F] text-xs uppercase tracking-wide text-[#858590]">
                  <tr>
                    <th scope="col" className="px-4 py-3">Row</th>
                    <th scope="col" className="px-4 py-3">Student ID</th>
                    <th scope="col" className="px-4 py-3">Name</th>
                    <th scope="col" className="px-4 py-3">Email</th>
                    <th scope="col" className="px-4 py-3">Batch</th>
                    <th scope="col" className="px-4 py-3">Section</th>
                    <th scope="col" className="px-4 py-3">Validation</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {previewRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className="align-top hover:bg-[#26272B]/40"
                    >
                      <td className="px-4 py-4 text-[#858590]">
                        {row.rowNumber}
                      </td>

                      <td className="px-4 py-4 text-[#D6D6DF]">
                        {row.studentId || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#EAEAE6]">
                        {row.name || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#B8B8C2]">
                        {row.email || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#B8B8C2]">
                        {row.batch || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#B8B8C2]">
                        {row.section || '—'}
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <StatusBadge status={row.status} />

                          {row.errors.length > 0 && (
                            <ul className="max-w-xs list-inside list-disc space-y-1 text-xs leading-5 text-rose-300">
                              {row.errors.map((error) => (
                                <li key={error}>{error}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length > MAX_PREVIEW_ROWS && (
              <p className="mt-4 text-xs text-[#858590]">
                Showing the first {MAX_PREVIEW_ROWS} of {rows.length} rows.
                Validation has been run on all parsed rows.
              </p>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Step 4"
        title="Import summary"
        description="Review the current validation outcome. No records have been written to the database."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Rows reviewed"
            value={summary.total}
            description="Rows parsed from the selected CSV"
          />

          <MetricCard
            label="Rows ready for review"
            value={summary.valid}
            description="Passed local validation only"
          />

          <MetricCard
            label="Rows requiring correction"
            value={summary.invalid}
            description="Contain missing fields or format errors"
          />
        </div>

        <div className="mt-5 rounded-xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-4">
          <p className="text-sm font-semibold text-[#E5DF98]">
            Import is not connected
          </p>

          <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
            Local validation does not verify whether student IDs already
            exist, whether emails are registered, or whether a batch and
            section are assigned to this mentor. Those checks must be
            performed by the backend before any records are created.
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={clearFile}
            disabled={!fileName}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#26272B] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset import
          </button>

          <button
            type="button"
            disabled
            title="Import will be enabled after the backend import API is implemented."
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-[#CDB5F7]/40 px-4 py-2.5 text-sm font-semibold text-[#191621]/70"
          >
            Import students
          </button>
        </div>
      </SectionCard>
    </div>
  );
}