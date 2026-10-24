import {
  generateStudentImportTemplate,
} from '../services/provisioning/student-import-template.service.js';
import {
  generateStudentXlsxTemplate,
} from '../services/provisioning/student-xlsx-template.service.js';

export async function downloadStudentImportTemplateController(
  req,
  res,
  next,
) {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();

    if (!['csv', 'xlsx'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported template format. Use csv or xlsx.',
      });
    }

    res.setHeader('Cache-Control', 'no-store');

    if (format === 'xlsx') {
      const workbookBuffer = await generateStudentXlsxTemplate();

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="student-import-template.xlsx"',
      );

      return res.status(200).send(Buffer.from(workbookBuffer));
    }

    const csvContent = generateStudentImportTemplate();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="student-import-template.csv"',
    );

    return res.status(200).send(`\uFEFF${csvContent}`);
  } catch (error) {
    return next(error);
  }
}