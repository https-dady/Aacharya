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

const MAX_STUDENTS = 500;
const MAX_CSV_BYTES = 1024 * 1024;
const MAX_COLUMNS = ALLOWED_COLUMNS.length;
const MAX_FIELD_LENGTH = 1024;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_BYTES = 72;
const MAX_INSTITUTIONAL_ID_LENGTH = 50;
const MAX_FULL_NAME_LENGTH = 100;

export class StudentImportError extends Error {
  constructor(message, details = []) {
    super(message);

    this.name = 'StudentImportError';
    this.statusCode = 400;
    this.details = details;
  }
}

/**
 * Parse CSV records while supporting:
 * - Quoted commas
 * - Escaped double quotes
 * - Quoted multiline values
 * - CRLF and LF line endings
 *
 * The parser rejects malformed quoting and enforces
 * limits before returning parsed records.
 */
function parseCsvRecords(content) {
  const records = [];

  let record = [];
  let field = '';
  let quoted = false;
  let quoteClosed = false;
  let physicalLine = 1;
  let recordLine = 1;
  let fieldStarted = false;

  function appendCharacter(character) {
    field += character;

    if (field.length > MAX_FIELD_LENGTH) {
      throw new StudentImportError(
        `A CSV field exceeds the maximum length near line ${physicalLine}.`,
      );
    }
  }

  function finishField() {
    const value = field.trim();

    if (value.length > MAX_FIELD_LENGTH) {
      throw new StudentImportError(
        `A CSV field exceeds the maximum length near line ${physicalLine}.`,
      );
    }

    record.push(value);

    if (record.length > MAX_COLUMNS) {
      throw new StudentImportError(
        `The CSV contains more than ${MAX_COLUMNS} columns near line ${physicalLine}.`,
      );
    }

    field = '';
    fieldStarted = false;
    quoteClosed = false;
  }

  function finishRecord() {
    finishField();

    if (record.some((value) => value.length > 0)) {
      records.push({
        values: record,
        rowNumber: recordLine,
      });

      if (records.length > MAX_STUDENTS + 1) {
        throw new StudentImportError(
          `A maximum of ${MAX_STUDENTS} student records can be imported.`,
        );
      }
    }

    record = [];
    recordLine = physicalLine + 1;
  }

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];

    if (quoted) {
      if (character === '"' && next === '"') {
        appendCharacter('"');
        index += 1;
        continue;
      }

      if (character === '"') {
        quoted = false;
        quoteClosed = true;
        continue;
      }

      appendCharacter(character);

      if (character === '\n') {
        physicalLine += 1;
      } else if (
        character === '\r' &&
        next !== '\n'
      ) {
        physicalLine += 1;
      }

      continue;
    }

    if (quoteClosed) {
      if (
        character === ',' ||
        character === '\n' ||
        character === '\r'
      ) {
        // Delimiter processing continues below.
      } else if (
        character === ' ' ||
        character === '\t'
      ) {
        continue;
      } else {
        throw new StudentImportError(
          `Unexpected character after a closing quote near line ${physicalLine}.`,
        );
      }
    }

    if (character === '"') {
      if (fieldStarted || field.length > 0) {
        throw new StudentImportError(
          `Unexpected quotation mark near line ${physicalLine}.`,
        );
      }

      quoted = true;
      fieldStarted = true;
      continue;
    }

    if (character === ',') {
      finishField();
      continue;
    }

    if (
      character === '\n' ||
      character === '\r'
    ) {
      if (
        character === '\r' &&
        next === '\n'
      ) {
        index += 1;
      }

      finishRecord();

      physicalLine += 1;
      recordLine = physicalLine;

      continue;
    }

    appendCharacter(character);

    if (character !== ' ' && character !== '\t') {
      fieldStarted = true;
    }
  }

  if (quoted) {
    throw new StudentImportError(
      `CSV contains an unclosed quotation mark starting on line ${recordLine}.`,
    );
  }

  if (
    field.length > 0 ||
    record.length > 0 ||
    quoteClosed ||
    fieldStarted
  ) {
    finishRecord();
  }

  return records;
}

function normalizeHeaders(headers) {
  if (!Array.isArray(headers) || headers.length === 0) {
    throw new StudentImportError(
      'The CSV header row is missing.',
    );
  }

  if (headers.length > MAX_COLUMNS) {
    throw new StudentImportError(
      `The CSV cannot contain more than ${MAX_COLUMNS} columns.`,
    );
  }

  const normalized = headers.map((header) =>
    String(header).trim().toLowerCase(),
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

  // FIX: Compare normalized headers against lowercase
  // required column names.
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
          column.toLowerCase() ===
          String(header).trim().toLowerCase(),
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
        column.toLowerCase() ===
        String(header).trim().toLowerCase(),
    ),
  );
}

function validateDuplicates(rows) {
  const errors = [];
  const seenIds = new Map();
  const seenEmails = new Map();

  for (const row of rows) {
    const institutionalId =
      row.institutionalId.trim().toUpperCase();

    const normalizedEmail =
      row.email?.trim().toLowerCase();

    if (seenIds.has(institutionalId)) {
      errors.push({
        row: row.rowNumber,
        message:
          `Duplicate institutionalId also appears on row ${seenIds.get(institutionalId)}.`,
      });
    } else {
      seenIds.set(
        institutionalId,
        row.rowNumber,
      );
    }

    if (normalizedEmail) {
      if (seenEmails.has(normalizedEmail)) {
        errors.push({
          row: row.rowNumber,
          message:
            `Duplicate email also appears on row ${seenEmails.get(normalizedEmail)}.`,
        });
      } else {
        seenEmails.set(
          normalizedEmail,
          row.rowNumber,
        );
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

function validateStudentRow(item, rowNumber) {
  const errors = [];

  const missing = REQUIRED_COLUMNS.filter(
    (column) =>
      typeof item[column] !== 'string' ||
      !item[column].trim(),
  );

  if (missing.length > 0) {
    return {
      error: {
        row: rowNumber,
        message:
          `Missing required values: ${missing.join(', ')}.`,
      },
    };
  }

  const institutionalId =
    item.institutionalId.trim().toUpperCase();

  const fullName = item.fullName.trim();
  const password = item.password;

  const email =
    item.email?.trim().toLowerCase() || undefined;

  if (
    institutionalId.length < 2 ||
    institutionalId.length > MAX_INSTITUTIONAL_ID_LENGTH
  ) {
    errors.push(
      `institutionalId must be between 2 and ${MAX_INSTITUTIONAL_ID_LENGTH} characters.`,
    );
  }

  if (
    fullName.length < 2 ||
    fullName.length > MAX_FULL_NAME_LENGTH
  ) {
    errors.push(
      `fullName must be between 2 and ${MAX_FULL_NAME_LENGTH} characters.`,
    );
  }

  if (
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES
  ) {
    errors.push(
      'Password must contain at least 8 characters and cannot exceed 72 UTF-8 bytes.',
    );
  }

  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(password)) {
    errors.push(
      'Password contains unsupported control characters.',
    );
  }

  if (email) {
    if (email.length > MAX_EMAIL_LENGTH) {
      errors.push(
        `Email cannot exceed ${MAX_EMAIL_LENGTH} characters.`,
      );
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email address.');
    }
  }

  if (errors.length > 0) {
    return {
      error: {
        row: rowNumber,
        message: errors.join(' '),
      },
    };
  }

  return {
    student: {
      institutionalId,
      fullName,
      password,
      email,
      rowNumber,
    },
  };
}

/**
 * Parse and validate CSV student records.
 *
 * Supported columns:
 * institutionalId, fullName, password, email (optional)
 */
export function parseStudentCsv(csvContent) {
  if (
    typeof csvContent !== 'string' ||
    !csvContent.trim()
  ) {
    throw new StudentImportError(
      'The CSV file is empty.',
    );
  }

  if (
    Buffer.byteLength(csvContent, 'utf8') >
    MAX_CSV_BYTES
  ) {
    throw new StudentImportError(
      'CSV content must not exceed 1 MB.',
    );
  }

  if (csvContent.includes('\u0000')) {
    throw new StudentImportError(
      'The CSV contains unsupported null characters.',
    );
  }

  const content = csvContent.replace(/^\uFEFF/, '');
  const records = parseCsvRecords(content);

  if (records.length < 2) {
    throw new StudentImportError(
      'The CSV must contain a header row and at least one student.',
    );
  }

  const headers = normalizeHeaders(
    records[0].values,
  );

  const rows = [];
  const errors = [];

  for (const record of records.slice(1)) {
    const {
      values,
      rowNumber,
    } = record;

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

    const validation = validateStudentRow(
      item,
      rowNumber,
    );

    if (validation.error) {
      errors.push(validation.error);
      continue;
    }

    rows.push(validation.student);
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