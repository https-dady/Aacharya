const TEMPLATE_HEADERS = [
  'institutionalId',
  'fullName',
  'password',
  'email',
];


/**
 * Generates a blank CSV template for student account provisioning.
 *
 * Required columns:
 * - institutionalId
 * - fullName
 * - password
 *
 * Optional column:
 * - email
 *
 * No example credentials are included in the downloadable template.
 */
export function generateStudentImportTemplate() {
  return `${TEMPLATE_HEADERS.join(',')}\r\n`;
}

export function generateStudentImportHeaders() {
  return [...TEMPLATE_HEADERS];
}