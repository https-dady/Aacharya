import ExcelJS from 'exceljs';
import {
  parseStudentWorksheet,
} from './student-xlsx-import.service.js';
import { StudentImportError } from './student-import.service.js';

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

  const worksheetRows = [];

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values = [];

    for (let column = 1; column <= EXPECTED_HEADERS.length; column += 1) {
      const cell = row.getCell(column);

      if (cell.type === ExcelJS.ValueType.Formula) {
        throw new StudentImportError(
          `Formula cells are not allowed (row ${row.number}, column ${column}).`,
        );
      }

      const value = cell.value;

      if (
        value !== null &&
        typeof value === 'object'
      ) {
        throw new StudentImportError(
          `Unsupported cell value (row ${row.number}, column ${column}).`,
        );
      }

      values.push(value == null ? '' : String(value).trim());
    }

    worksheetRows.push(values);
  });

  return parseStudentWorksheet(worksheetRows);
}