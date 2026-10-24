import ExcelJS from 'exceljs';
import {
  parseStudentWorksheet,
} from './student-xlsx-import.service.js';
import {
  StudentImportError,
} from './student-import.service.js';

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_STUDENTS = 500;

const EXPECTED_HEADERS = [
  'institutionalId',
  'fullName',
  'password',
  'email',
];

export async function readStudentXlsx(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new StudentImportError('An XLSX file is required.');
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

  if (worksheet.state !== 'visible') {
    throw new StudentImportError(
      'The worksheet must be visible.',
    );
  }

  if (worksheet.rowCount < 2) {
    throw new StudentImportError(
      'The worksheet must contain a header and at least one student.',
    );
  }

  if (worksheet.rowCount > MAX_STUDENTS + 1) {
    throw new StudentImportError(
      `A maximum of ${MAX_STUDENTS} students can be imported at once.`,
    );
  }

  const headerRow = worksheet.getRow(1);

  if (headerRow.cellCount > EXPECTED_HEADERS.length) {
    throw new StudentImportError(
      'The worksheet contains unsupported extra columns.',
    );
  }

  const headers = [];

  for (let column = 1; column <= EXPECTED_HEADERS.length; column += 1) {
    const cell = headerRow.getCell(column);

    if (cell.type === ExcelJS.ValueType.Formula) {
      throw new StudentImportError(
        'Formula cells are not allowed in the header row.',
      );
    }

    const value = cell.value;

    if (value !== null && typeof value === 'object') {
      throw new StudentImportError(
        'The header row contains unsupported cell values.',
      );
    }

    headers.push(String(value ?? '').trim());
  }

  const normalizedHeaders = headers.map((header) =>
    header.toLowerCase(),
  );

  if (
    normalizedHeaders.length !== EXPECTED_HEADERS.length ||
    normalizedHeaders.some(
      (header, index) =>
        header !== EXPECTED_HEADERS[index].toLowerCase(),
    )
  ) {
    throw new StudentImportError(
      `The XLSX header must contain these columns in order: ${EXPECTED_HEADERS.join(', ')}.`,
    );
  }

  const worksheetRows = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    if (row.hidden) {
      throw new StudentImportError(
        `Hidden rows are not allowed (row ${rowNumber}).`,
      );
    }

    const values = [];
    let hasValue = false;

    for (let column = 1; column <= EXPECTED_HEADERS.length; column += 1) {
      const cell = row.getCell(column);

      if (cell.type === ExcelJS.ValueType.Formula) {
        throw new StudentImportError(
          `Formula cells are not allowed (row ${rowNumber}, column ${column}).`,
        );
      }

      const value = cell.value;

      if (value !== null && typeof value === 'object') {
        throw new StudentImportError(
          `Unsupported cell value (row ${rowNumber}, column ${column}).`,
        );
      }

      const normalizedValue = value == null ? '' : String(value).trim();

      if (normalizedValue) {
        hasValue = true;
      }

      values.push(normalizedValue);
    }

    if (row.cellCount > EXPECTED_HEADERS.length) {
      throw new StudentImportError(
        `Extra columns are not allowed (row ${rowNumber}).`,
      );
    }

    if (!hasValue) {
      continue;
    }

    worksheetRows.push({
      rowNumber,
      values,
    });
  }

  if (worksheetRows.length === 0) {
    throw new StudentImportError(
      'The worksheet does not contain any student records.',
    );
  }

  const normalizedRows = [
    headers,
    ...worksheetRows.map(({ values }) => values),
  ];

  const parsedRows = parseStudentWorksheet(normalizedRows);

  return parsedRows.map((student, index) => ({
    ...student,
    rowNumber: worksheetRows[index].rowNumber,
  }));
}