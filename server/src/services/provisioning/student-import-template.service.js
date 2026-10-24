const TEMPLATE_HEADERS = [
  'institutionalId',
  'fullName',
  'password',
  'email',
];

const TEMPLATE_EXAMPLE_ROWS = [
  ['STU001', 'Rahul Sharma', 'ChangeMe123!', 'rahul@example.com'],
  ['STU002', 'Priya Verma', 'ChangeMe456!', 'priya@example.com'],
];

function escapeCsvValue(value) {
  const stringValue = String(value ?? '');

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function generateStudentImportTemplate() {
  const rows = [
    TEMPLATE_HEADERS,
    ...TEMPLATE_EXAMPLE_ROWS,
  ];

  return rows
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\r\n')
    .concat('\r\n');
}

export function generateStudentImportHeaders() {
  return [...TEMPLATE_HEADERS];
}