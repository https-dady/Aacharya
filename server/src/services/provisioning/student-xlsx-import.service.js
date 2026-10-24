import {
  parseStudentCsv,
  StudentImportError,
} from './student-import.service.js';

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

function escapeCsvValue(value) {
  const text = String(value ?? '');

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

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

  if (normalizedHeaders.some((header) => !header)) {
    throw new StudentImportError(
      'The spreadsheet contains an empty column name.',
    );
  }

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

  const csvLines = [headers.map(escapeCsvValue).join(',')];

  const originalRowNumbers = [];
  const rowErrors = [];

  for (let index = 1; index < worksheetRows.length; index += 1) {
    const worksheetRow = worksheetRows[index];

    const rowNumber =
      worksheetRow && !Array.isArray(worksheetRow)
        ? worksheetRow.rowNumber ?? index + 1
        : index + 1;

    const values =
      worksheetRow && !Array.isArray(worksheetRow)
        ? worksheetRow.values
        : worksheetRow;

    if (!Array.isArray(values)) {
      rowErrors.push({
        row: rowNumber,
        message: 'Invalid spreadsheet row.',
      });
      continue;
    }

    if (values.length > headers.length) {
      rowErrors.push({
        row: rowNumber,
        message: `Expected at most ${headers.length} columns but received ${values.length}.`,
      });
      continue;
    }

    const normalizedValues = headers.map((_, columnIndex) =>
      String(values[columnIndex] ?? '').trim(),
    );

    if (normalizedValues.every((value) => value === '')) {
      continue;
    }

    csvLines.push(normalizedValues.map(escapeCsvValue).join(','));
    originalRowNumbers.push(rowNumber);
  }

  if (rowErrors.length > 0) {
    throw new StudentImportError(
      'The spreadsheet contains invalid rows.',
      rowErrors,
    );
  }

  if (originalRowNumbers.length === 0) {
    throw new StudentImportError(
      'The spreadsheet does not contain any student records.',
    );
  }

  const parsedRows = parseStudentCsv(csvLines.join('\n'));

  return parsedRows.map((student, index) => ({
    ...student,
    rowNumber: originalRowNumbers[index],
  }));
}