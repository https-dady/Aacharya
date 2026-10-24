import ExcelJS from 'exceljs';

import {
  parseStudentWorksheet,
} from './student-xlsx-import.service.js';

import {
  StudentImportError,
} from './student-import.service.js';

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_STUDENTS = 500;
const MAX_WORKSHEETS = 1;
const MAX_COLUMNS = 4;
const MAX_CELL_LENGTH = 1024;
const MAX_HEADER_LENGTH = 50;

const REQUIRED_HEADERS = [
  'institutionalId',
  'fullName',
  'password',
];

const ALLOWED_HEADERS = [
  ...REQUIRED_HEADERS,
  'email',
];

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function cellToText(cell, rowNumber, columnNumber) {
  if (
    cell.type === ExcelJS.ValueType.Formula ||
    cell.type === ExcelJS.ValueType.SharedFormula
  ) {
    throw new StudentImportError(
      `Formula cells are not allowed at row ${rowNumber}, column ${columnNumber}.`,
    );
  }

  if (
    cell.value !== null &&
    typeof cell.value === 'object'
  ) {
    throw new StudentImportError(
      `Unsupported cell value at row ${rowNumber}, column ${columnNumber}.`,
    );
  }

  const value = String(cell.value ?? '').trim();

  if (value.length > MAX_CELL_LENGTH) {
    throw new StudentImportError(
      `Cell content exceeds the maximum allowed length at row ${rowNumber}, column ${columnNumber}.`,
    );
  }

  if (value.includes('\u0000')) {
    throw new StudentImportError(
      `Null characters are not allowed at row ${rowNumber}, column ${columnNumber}.`,
    );
  }

  return value;
}

function validateWorkbookBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new StudentImportError(
      'A non-empty XLSX file is required.',
    );
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new StudentImportError(
      'The XLSX file must not exceed 1 MB.',
    );
  }

  /*
   * XLSX files are ZIP containers.
   * Reject buffers that do not begin with a ZIP signature.
   */
  const hasZipSignature =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (
      (
        buffer[2] === 0x03 &&
        buffer[3] === 0x04
      ) ||
      (
        buffer[2] === 0x05 &&
        buffer[3] === 0x06
      ) ||
      (
        buffer[2] === 0x07 &&
        buffer[3] === 0x08
      )
    );

  if (!hasZipSignature) {
    throw new StudentImportError(
      'The uploaded file is not a valid XLSX workbook.',
    );
  }
}

function validateHeaders(headerRow) {
  const headerWidth = Math.max(
    headerRow.cellCount,
    headerRow.actualCellCount,
  );

  if (
    headerWidth < REQUIRED_HEADERS.length ||
    headerWidth > MAX_COLUMNS
  ) {
    throw new StudentImportError(
      `The XLSX header must contain ${REQUIRED_HEADERS.join(', ')} and may optionally include email.`,
    );
  }

  const headers = [];

  for (
    let column = 1;
    column <= headerWidth;
    column += 1
  ) {
    const value = cellToText(
      headerRow.getCell(column),
      1,
      column,
    );

    if (
      !value ||
      value.length > MAX_HEADER_LENGTH
    ) {
      throw new StudentImportError(
        `Invalid or empty column name at column ${column}.`,
      );
    }

    headers.push(value);
  }

  const normalizedHeaders = headers.map(
    normalizeHeader,
  );

  if (
    new Set(normalizedHeaders).size !==
    normalizedHeaders.length
  ) {
    throw new StudentImportError(
      'The spreadsheet contains duplicate column names.',
    );
  }

  const unsupported = headers.filter(
    (header) =>
      !ALLOWED_HEADERS.some(
        (allowed) =>
          normalizeHeader(allowed) ===
          normalizeHeader(header),
      ),
  );

  if (unsupported.length > 0) {
    throw new StudentImportError(
      `Unsupported columns: ${unsupported.join(', ')}.`,
    );
  }

  const missing = REQUIRED_HEADERS.filter(
    (required) =>
      !normalizedHeaders.includes(
        normalizeHeader(required),
      ),
  );

  if (missing.length > 0) {
    throw new StudentImportError(
      `Missing required columns: ${missing.join(', ')}.`,
    );
  }

  return {
    headers,
    headerWidth,
  };
}

function validateWorksheet(worksheet) {
  if (worksheet.state !== 'visible') {
    throw new StudentImportError(
      'The worksheet must be visible.',
    );
  }

  if (worksheet.rowCount > MAX_STUDENTS + 1) {
    throw new StudentImportError(
      `The worksheet cannot contain more than ${MAX_STUDENTS} student rows plus one header row.`,
    );
  }

  /*
   * Reject merged cells because they can make individual
   * student fields ambiguous.
   */
  if (worksheet.model?.merges?.length > 0) {
    throw new StudentImportError(
      'Merged cells are not allowed in the student import template.',
    );
  }

  /*
   * Hidden columns could conceal values from the operator.
   */
  for (
    let columnNumber = 1;
    columnNumber <= MAX_COLUMNS;
    columnNumber += 1
  ) {
    const column = worksheet.getColumn(columnNumber);

    if (column.hidden) {
      throw new StudentImportError(
        `Hidden columns are not allowed (column ${columnNumber}).`,
      );
    }
  }
}

export async function readStudentXlsx(buffer) {
  validateWorkbookBuffer(buffer);

  let workbook;

  try {
    workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(buffer);
  } catch {
    throw new StudentImportError(
      'The uploaded file is not a valid or readable XLSX workbook.',
    );
  }

  if (
    workbook.worksheets.length !== MAX_WORKSHEETS
  ) {
    throw new StudentImportError(
      'The workbook must contain exactly one worksheet.',
    );
  }

  const worksheet = workbook.worksheets[0];

  validateWorksheet(worksheet);

  const headerRow = worksheet.getRow(1);

  const {
    headers,
    headerWidth,
  } = validateHeaders(headerRow);

  const worksheetRows = [];

  for (
    let rowNumber = 2;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const row = worksheet.getRow(rowNumber);

    if (row.hidden) {
      throw new StudentImportError(
        `Hidden rows are not allowed (row ${rowNumber}).`,
      );
    }

    const width = Math.max(
      row.cellCount,
      row.actualCellCount,
    );

    if (width > headerWidth) {
      throw new StudentImportError(
        `Extra columns are not allowed (row ${rowNumber}).`,
      );
    }

    const values = [];

    for (
      let column = 1;
      column <= headerWidth;
      column += 1
    ) {
      values.push(
        cellToText(
          row.getCell(column),
          rowNumber,
          column,
        ),
      );
    }

    /*
     * Ignore completely empty rows while preserving the
     * original spreadsheet row number for error reporting.
     */
    if (values.every((value) => !value)) {
      continue;
    }

    worksheetRows.push({
      rowNumber,
      values,
    });

    if (worksheetRows.length > MAX_STUDENTS) {
      throw new StudentImportError(
        `A maximum of ${MAX_STUDENTS} students can be imported at once.`,
      );
    }
  }

  if (worksheetRows.length === 0) {
    throw new StudentImportError(
      'The worksheet does not contain any student records.',
    );
  }

  /*
   * Delegate field-level validation and duplicate detection
   * to the existing shared worksheet parser.
   */
  return parseStudentWorksheet([
    headers,
    ...worksheetRows,
  ]);
}