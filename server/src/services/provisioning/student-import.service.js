const REQUIRED_COLUMNS = ['institutionalId', 'fullName', 'password'];
const OPTIONAL_COLUMNS = ['email'];
const ALLOWED_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
const MAX_STUDENTS = 500;

export class StudentImportError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'StudentImportError';
    this.statusCode = 400;
    this.details = details;
  }
}

/**
 * Parse CSV records, including:
 * - Quoted commas
 * - Escaped double quotes
 * - Quoted multiline values
 * - CRLF and LF line endings
 *
 * Original physical line numbers are preserved for error reporting.
 */
function parseCsvRecords(content) {
  const records = [];

  let record = [];
  let field = '';
  let quoted = false;
  let quoteClosed = false;
  let physicalLine = 1;
  let recordLine = 1;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
        quoteClosed = true;
      } else {
        field += char;

        if (char === '\n') {
          physicalLine += 1;
        } else if (char === '\r' && next !== '\n') {
          physicalLine += 1;
        }
      }

      continue;
    }

    if (quoteClosed) {
      if (char === ',' || char === '\n' || char === '\r') {
        // Continue to normal delimiter handling.
      } else if (char === ' ' || char === '\t') {
        continue;
      } else {
        throw new StudentImportError(
          `Unexpected character after a closing quote near line ${physicalLine}.`,
        );
      }
    }

    if (char === '"') {
      if (field.length !== 0) {
        throw new StudentImportError(
          `Unexpected quotation mark near line ${physicalLine}.`,
        );
      }

      quoted = true;
      quoteClosed = false;
    } else if (char === ',') {
      record.push(field.trim());
      field = '';
      quoteClosed = false;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') {
        index += 1;
      }

      record.push(field.trim());

      if (record.some((value) => value.length > 0)) {
        records.push({
          values: record,
          rowNumber: recordLine,
        });
      }

      record = [];
      field = '';
      quoteClosed = false;

      physicalLine += 1;
      recordLine = physicalLine;
    } else {
      field += char;
    }
  }

  if (quoted) {
    throw new StudentImportError(
      `CSV contains an unclosed quotation mark starting on line ${recordLine}.`,
    );
  }

  if (field.length > 0 || record.length > 0 || quoteClosed) {
    record.push(field.trim());

    if (record.some((value) => value.length > 0)) {
      records.push({
        values: record,
        rowNumber: recordLine,
      });
    }
  }

  return records;
}

function normalizeHeaders(headers) {
  const normalized = headers.map((header) =>
    header.trim().toLowerCase(),
  );

  if (normalized.some((header) => !header)) {
    throw new StudentImportError(
      'The CSV contains an empty column name.',
    );
  }

  if (new Set(normalized).size !== normalized.length) {
    throw new StudentImportError(
      'The CSV contains duplicate column names.',
    );
  }

  const missing = REQUIRED_COLUMNS.filter(
    (column) => !normalized.includes(column.toLowerCase()),
  );

  if (missing.length > 0) {
    throw new StudentImportError(
      `Missing required columns: ${missing.join(', ')}.`,
    );
  }

  const unsupported = headers.filter(
    (header) =>
      !ALLOWED_COLUMNS.some(
        (column) =>
          column.toLowerCase() === header.trim().toLowerCase(),
      ),
  );

  if (unsupported.length > 0) {
    throw new StudentImportError(
      `Unsupported columns: ${unsupported.join(', ')}.`,
    );
  }

  return headers.map((header) =>
    ALLOWED_COLUMNS.find(
      (column) =>
        column.toLowerCase() === header.trim().toLowerCase(),
    ),
  );
}

function validateDuplicates(rows) {
  const errors = [];
  const seenIds = new Map();
  const seenEmails = new Map();

  for (const row of rows) {
    const institutionalId = row.institutionalId.toUpperCase();

    if (seenIds.has(institutionalId)) {
      errors.push({
        row: row.rowNumber,
        message:
          `Duplicate institutionalId also appears on row ${seenIds.get(institutionalId)}.`,
      });
    } else {
      seenIds.set(institutionalId, row.rowNumber);
    }

    if (row.email) {
      const email = row.email.toLowerCase();

      if (seenEmails.has(email)) {
        errors.push({
          row: row.rowNumber,
          message:
            `Duplicate email also appears on row ${seenEmails.get(email)}.`,
        });
      } else {
        seenEmails.set(email, row.rowNumber);
      }
    }
  }

  if (errors.length > 0) {
    throw new StudentImportError(
      'The import contains duplicate student identifiers.',
      errors,
    );
  }
}

export function parseStudentCsv(csvContent) {
  if (
    typeof csvContent !== 'string' ||
    !csvContent.trim()
  ) {
    throw new StudentImportError('The CSV file is empty.');
  }

  const content = csvContent.replace(/^\uFEFF/, '');
  const records = parseCsvRecords(content);

  if (records.length < 2) {
    throw new StudentImportError(
      'The CSV must contain a header row and at least one student.',
    );
  }

  const headers = normalizeHeaders(records[0].values);
  const rows = [];
  const errors = [];

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const record of records.slice(1)) {
    const { values, rowNumber } = record;

    if (values.length !== headers.length) {
      errors.push({
        row: rowNumber,
        message:
          `Expected ${headers.length} columns but received ${values.length}.`,
      });

      continue;
    }

    const item = {};

    headers.forEach((header, index) => {
      item[header] = values[index];
    });

    const missing = REQUIRED_COLUMNS.filter(
      (column) => !item[column]?.trim(),
    );

    if (missing.length > 0) {
      errors.push({
        row: rowNumber,
        message:
          `Missing required values: ${missing.join(', ')}.`,
      });

      continue;
    }

    const email = item.email?.trim().toLowerCase() || undefined;

    if (email && !emailPattern.test(email)) {
      errors.push({
        row: rowNumber,
        message: 'Invalid email address.',
      });

      continue;
    }

    const password = item.password;

    if (password.length < 8) {
      errors.push({
        row: rowNumber,
        message:
          'Password must contain at least 8 characters.',
      });

      continue;
    }

    // bcrypt processes passwords up to 72 UTF-8 bytes.
    if (Buffer.byteLength(password, 'utf8') > 72) {
      errors.push({
        row: rowNumber,
        message:
          'Password cannot exceed 72 UTF-8 bytes.',
      });

      continue;
    }

    const institutionalId =
      item.institutionalId.trim().toUpperCase();

    const fullName = item.fullName.trim();

    if (
      institutionalId.length < 2 ||
      institutionalId.length > 50
    ) {
      errors.push({
        row: rowNumber,
        message:
          'institutionalId must be between 2 and 50 characters.',
      });

      continue;
    }

    if (fullName.length < 2 || fullName.length > 100) {
      errors.push({
        row: rowNumber,
        message:
          'fullName must be between 2 and 100 characters.',
      });

      continue;
    }

    rows.push({
      institutionalId,
      fullName,
      password,
      email,
      rowNumber,
    });
  }

  if (errors.length > 0) {
    throw new StudentImportError(
      'The CSV contains invalid student records.',
      errors,
    );
  }

  if (rows.length === 0) {
    throw new StudentImportError(
      'The CSV does not contain any student records.',
    );
  }

  if (rows.length > MAX_STUDENTS) {
    throw new StudentImportError(
      `A maximum of ${MAX_STUDENTS} students can be imported at once.`,
    );
  }

  validateDuplicates(rows);

  return rows;
}