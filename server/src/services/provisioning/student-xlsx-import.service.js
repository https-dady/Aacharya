import { parseStudentCsv, StudentImportError } from './student-import.service.js';

const REQUIRED_COLUMNS = [
  'institutionalId',
  'fullName',
  'password',
];

const OPTIONAL_COLUMNS = ['email'];

const ALLOWED_COLUMNS = [
  ...REQUIRED_COLUMNS,
  ...OPTIONAL_COLUMNS,
];

/**
 * Converts spreadsheet rows into CSV-compatible content.
 * The XLSX library is injected to avoid coupling this service
 * to a particular workbook-loading implementation.
 */
export function parseStudentWorksheet(worksheetRows) {
  if (!Array.isArray(worksheetRows) || worksheetRows.length < 2) {
    throw new StudentImportError(
      'The spreadsheet must contain a header row and at least one student.',
    );
  }

  const headers = worksheetRows[0].map((value) =>
    String(value ?? '').trim(),
  );

  const normalizedHeaders = headers.map((header) =>
    header.toLowerCase(),
  );

  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    throw new StudentImportError(
      'The spreadsheet contains duplicate column names.',
    );
  }

  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !normalizedHeaders.includes(column.toLowerCase()),
  );

  if (missingColumns.length > 0) {
    throw new StudentImportError(
      `Missing required columns: ${missingColumns.join(', ')}.`,
    );
  }

  const unsupportedColumns = headers.filter(
    (header) =>
      !ALLOWED_COLUMNS.some(
        (column) => column.toLowerCase() === header.toLowerCase(),
      ),
  );

  if (unsupportedColumns.length > 0) {
    throw new StudentImportError(
      `Unsupported columns: ${unsupportedColumns.join(', ')}.`,
    );
  }

  const csvEscape = (value) => {
    const text = String(value ?? '');

    return /[",\r\n]/.test(text)
      ? `"${text.replace(/"/g, '""')}"`
      : text;
  };

  const csvContent = worksheetRows
    .map((row) => {
      if (!Array.isArray(row)) {
        throw new StudentImportError(
          'The spreadsheet contains an invalid row.',
        );
      }

      return headers
        .map((_, index) => csvEscape(row[index]))
        .join(',');
    })
    .join('\n');

  return parseStudentCsv(csvContent);
}