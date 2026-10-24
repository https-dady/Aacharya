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

export class StudentImportError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'StudentImportError';
    this.statusCode = 400;
    this.details = details;
  }
}

function parseCsvLine(line, lineNumber) {
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
    throw new StudentImportError(
      `CSV contains an unclosed quotation mark on line ${lineNumber}.`,
    );
  }

  values.push(value.trim());

  return values;
}

function findDuplicateRows(rows, field, normalize = (value) => value) {
  const firstRowByValue = new Map();
  const duplicates = [];

  for (const row of rows) {
    const value = normalize(row[field]);

    if (!value) {
      continue;
    }

    if (firstRowByValue.has(value)) {
      duplicates.push({
        row: row.rowNumber,
        message: `Duplicate ${field} "${row[field]}" also appears on row ${firstRowByValue.get(value)}.`,
      });
    } else {
      firstRowByValue.set(value, row.rowNumber);
    }
  }

  return duplicates;
}

export function parseStudentCsv(csvContent) {
  if (typeof csvContent !== 'string' || !csvContent.trim()) {
    throw new StudentImportError('The CSV file is empty.');
  }

  const normalizedContent = csvContent
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = normalizedContent
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new StudentImportError(
      'The CSV must contain a header row and at least one student.',
    );
  }

  const headers = parseCsvLine(lines[0], 1).map((header) =>
    header.trim(),
  );

  const normalizedHeaders = headers.map((header) =>
    header.toLowerCase(),
  );

  if (normalizedHeaders.some((header) => !header)) {
    throw new StudentImportError(
      'The CSV contains an empty column name.',
    );
  }

  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    throw new StudentImportError(
      'The CSV contains duplicate column names.',
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

  const rows = [];
  const errors = [];

  for (let index = 1; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    let values;

    try {
      values = parseCsvLine(lines[index], lineNumber);
    } catch (error) {
      errors.push({
        row: lineNumber,
        message: error.message,
      });
      continue;
    }

    if (values.length !== headers.length) {
      errors.push({
        row: lineNumber,
        message: `Expected ${headers.length} columns but received ${values.length}.`,
      });
      continue;
    }

    const row = {};

    headers.forEach((header, columnIndex) => {
      const canonicalHeader = ALLOWED_COLUMNS.find(
        (column) => column.toLowerCase() === header.toLowerCase(),
      );

      row[canonicalHeader] = values[columnIndex];
    });

    const missingValues = REQUIRED_COLUMNS.filter(
      (column) => !row[column],
    );

    if (missingValues.length > 0) {
      errors.push({
        row: lineNumber,
        message: `Missing required values: ${missingValues.join(', ')}.`,
      });
      continue;
    }

    if (row.email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(row.email)) {
        errors.push({
          row: lineNumber,
          message: 'Invalid email address.',
        });
        continue;
      }
    }

    if (row.password.length < 8) {
      errors.push({
        row: lineNumber,
        message: 'Password must contain at least 8 characters.',
      });
      continue;
    }

    rows.push({
      institutionalId: row.institutionalId.trim(),
      fullName: row.fullName.trim(),
      password: row.password,
      email: row.email?.trim().toLowerCase() || undefined,
      rowNumber: lineNumber,
    });
  }

  if (errors.length > 0) {
    throw new StudentImportError(
      'The CSV contains invalid student records.',
      errors,
    );
  }

  const duplicateIdErrors = findDuplicateRows(
    rows,
    'institutionalId',
    (value) => value.trim().toUpperCase(),
  );

  const duplicateEmailErrors = findDuplicateRows(
    rows,
    'email',
    (value) => value.trim().toLowerCase(),
  );

  const duplicateErrors = [
    ...duplicateIdErrors,
    ...duplicateEmailErrors,
  ];

  if (duplicateErrors.length > 0) {
    throw new StudentImportError(
      'The CSV contains duplicate student identifiers.',
      duplicateErrors,
    );
  }

  return rows;
}