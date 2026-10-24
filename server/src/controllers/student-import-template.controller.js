import { generateStudentImportTemplate } from '../services/provisioning/student-import-template.service.js';

export function downloadStudentImportTemplateController(req, res, next) {
  try {
    const csvContent = generateStudentImportTemplate();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="student-import-template.csv"',
    );
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).send(`\uFEFF${csvContent}`);
  } catch (error) {
    return next(error);
  }
}