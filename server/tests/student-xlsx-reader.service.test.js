import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';

import {
  readStudentXlsx,
} from '../src/services/provisioning/student-xlsx-reader.service.js';

import {
  StudentImportError,
} from '../src/services/provisioning/student-import.service.js';

async function createWorkbookBuffer({
  headers = [
    'institutionalId',
    'fullName',
    'password',
    'email',
  ],
  rows = [],
} = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');

  worksheet.addRow(headers);

  for (const row of rows) {
    worksheet.addRow(row);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test('imports a valid XLSX file with student records', async () => {
  const buffer = await createWorkbookBuffer({
    rows: [
      [
        'STU001',
        'First Student',
        'Password123',
        'first@example.com',
      ],
      [
        'STU002',
        'Second Student',
        'Password456',
        'second@example.com',
      ],
    ],
  });

  const students = await readStudentXlsx(buffer);

  assert.equal(students.length, 2);
  assert.equal(students[0].institutionalId, 'STU001');
  assert.equal(students[0].fullName, 'First Student');
  assert.equal(students[0].email, 'first@example.com');
  assert.equal(students[0].rowNumber, 2);
  assert.equal(students[1].rowNumber, 3);
});

test('supports an XLSX template without the optional email column', async () => {
  const buffer = await createWorkbookBuffer({
    headers: [
      'institutionalId',
      'fullName',
      'password',
    ],
    rows: [
      [
        'STU001',
        'Test Student',
        'Password123',
      ],
    ],
  });

  const students = await readStudentXlsx(buffer);

  assert.equal(students.length, 1);
  assert.equal(students[0].institutionalId, 'STU001');
  assert.equal(students[0].email, undefined);
});

test('supports reordered valid columns', async () => {
  const buffer = await createWorkbookBuffer({
    headers: [
      'email',
      'password',
      'institutionalId',
      'fullName',
    ],
    rows: [
      [
        'student@example.com',
        'Password123',
        'STU001',
        'Test Student',
      ],
    ],
  });

  const students = await readStudentXlsx(buffer);

  assert.equal(students[0].institutionalId, 'STU001');
  assert.equal(students[0].fullName, 'Test Student');
  assert.equal(students[0].email, 'student@example.com');
});

test('rejects an empty or invalid XLSX buffer', async () => {
  await assert.rejects(
    () => readStudentXlsx(Buffer.alloc(0)),
    StudentImportError,
  );

  await assert.rejects(
    () => readStudentXlsx(Buffer.from('not-an-xlsx-file')),
    StudentImportError,
  );
});

test('rejects XLSX files missing required columns', async () => {
  const buffer = await createWorkbookBuffer({
    headers: [
      'institutionalId',
      'fullName',
      'email',
    ],
    rows: [
      [
        'STU001',
        'Test Student',
        'student@example.com',
      ],
    ],
  });

  await assert.rejects(
    () => readStudentXlsx(buffer),
    (error) =>
      error instanceof StudentImportError &&
      error.message.toLowerCase().includes('password'),
  );
});

test('rejects duplicate spreadsheet headers', async () => {
  const buffer = await createWorkbookBuffer({
    headers: [
      'institutionalId',
      'fullName',
      'password',
      'email',
    ],
    rows: [
      [
        'STU001',
        'Test Student',
        'Password123',
        'student@example.com',
      ],
    ],
  });

  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];

  worksheet.getCell('D1').value = 'fullName';

  const duplicateHeaderBuffer = Buffer.from(
    await workbook.xlsx.writeBuffer(),
  );

  await assert.rejects(
    () => readStudentXlsx(duplicateHeaderBuffer),
    (error) =>
      error instanceof StudentImportError &&
      error.message.toLowerCase().includes('duplicate'),
  );
});

test('rejects formula cells in student data', async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');

  worksheet.addRow([
    'institutionalId',
    'fullName',
    'password',
    'email',
  ]);

  worksheet.addRow([
    'STU001',
    'Test Student',
    'Password123',
    'student@example.com',
  ]);

  worksheet.getCell('B2').value = {
    formula: '"Test Student"',
    result: 'Test Student',
  };

  const buffer = Buffer.from(
    await workbook.xlsx.writeBuffer(),
  );

  await assert.rejects(
    () => readStudentXlsx(buffer),
    StudentImportError,
  );
});

test('rejects hidden student rows', async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');

  worksheet.addRow([
    'institutionalId',
    'fullName',
    'password',
    'email',
  ]);

  worksheet.addRow([
    'STU001',
    'Test Student',
    'Password123',
    'student@example.com',
  ]);

  worksheet.getRow(2).hidden = true;

  const buffer = Buffer.from(
    await workbook.xlsx.writeBuffer(),
  );

  await assert.rejects(
    () => readStudentXlsx(buffer),
    (error) =>
      error instanceof StudentImportError &&
      error.message.includes('Hidden rows'),
  );
});

test('rejects duplicate student identifiers in XLSX records', async () => {
  const buffer = await createWorkbookBuffer({
    rows: [
      [
        'STU001',
        'First Student',
        'Password123',
        'first@example.com',
      ],
      [
        'STU001',
        'Second Student',
        'Password456',
        'second@example.com',
      ],
    ],
  });

  await assert.rejects(
    () => readStudentXlsx(buffer),
    StudentImportError,
  );
});

test('rejects invalid email addresses in XLSX records', async () => {
  const buffer = await createWorkbookBuffer({
    rows: [
      [
        'STU001',
        'Test Student',
        'Password123',
        'invalid-email',
      ],
    ],
  });

  await assert.rejects(
    () => readStudentXlsx(buffer),
    StudentImportError,
  );
});