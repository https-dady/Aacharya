import ExcelJS from 'exceljs';

import {
  parseStudentWorksheet,
} from './student-xlsx-import.service.js';

import {
  StudentImportError,
} from './student-import.service.js';

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_STUDENTS = 500;

const REQUIRED_HEADERS = [
  'institutionalId',
  'fullName',
  'password',
];

const ALLOWED_HEADERS = [
  ...REQUIRED_HEADERS,
  'email',
];

function cellToText(cell, rowNumber, columnNumber) {
  if (cell.type === ExcelJS.ValueType.Formula) {
    throw new StudentImportError(
      `Formula or unsupported cell value at row ${rowNumber}, column ${columnNumber}.`,
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

  return String(cell.value ?? '').trim();
}

export async function readStudentXlsx(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new StudentImportError(
      'An XLSX file is required.',
    );
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new StudentImportError(
      'The XLSX file must not exceed 1 MB.',
    );
  }

  let workbook;

  try {
    workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(buffer);
  } catch {
    throw new StudentImportError(
      'The uploaded file is not a valid XLSX workbook.',
    );
  }

  if (workbook.worksheets.length !== 1) {
    throw new StudentImportError(
      'The workbook must contain exactly one worksheet.',
    );
  }

  const worksheet = workbook.worksheets[0];

  if (worksheet.rowCount > MAX_STUDENTS + 1) {
    throw new StudentImportError(
      `A maximum of ${MAX_STUDENTS} spreadsheet rows can be processed, including the header.`,
    );
  }

  if (worksheet.state !== 'visible') {
    throw new StudentImportError(
      'The worksheet must be visible.',
    );
  }

  const headerRow = worksheet.getRow(1);

  const headerWidth = Math.max(
    headerRow.cellCount,
    headerRow.actualCellCount,
  );

  if (
    headerWidth < REQUIRED_HEADERS.length ||
    headerWidth > ALLOWED_HEADERS.length
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
    headers.push(
      cellToText(
        headerRow.getCell(column),
        1,
        column,
      ),
    );
  }

  const normalized = headers.map((header) =>
    header.toLowerCase(),
  );

  if (normalized.some((header) => !header)) {
    throw new StudentImportError(
      'The spreadsheet contains an empty column name.',
    );
  }

  if (new Set(normalized).size !== normalized.length) {
    throw new StudentImportError(
      'The spreadsheet contains duplicate column names.',
    );
  }

  const unsupported = headers.filter(
    (header) =>
      !ALLOWED_HEADERS.some(
        (allowed) =>
          allowed.toLowerCase() === header.toLowerCase(),
      ),
  );

  if (unsupported.length > 0) {
    throw new StudentImportError(
      `Unsupported columns: ${unsupported.join(', ')}.`,
    );
  }

  const missing = REQUIRED_HEADERS.filter(
    (required) =>
      !normalized.includes(required.toLowerCase()),
  );

  if (missing.length > 0) {
    throw new StudentImportError(
      `Missing required columns: ${missing.join(', ')}.`,
    );
  }

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

  return parseStudentWorksheet([
    headers,
    ...worksheetRows,
  ]);
}