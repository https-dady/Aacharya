import ExcelJS from 'exceljs';

const HEADERS = [
  'institutionalId',
  'fullName',
  'password',
  'email',
];

export async function generateStudentXlsxTemplate() {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Aacharya LMS';
  workbook.subject = 'Student bulk import template';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Students');

  worksheet.columns = [
    { header: HEADERS[0], key: HEADERS[0], width: 24 },
    { header: HEADERS[1], key: HEADERS[1], width: 30 },
    { header: HEADERS[2], key: HEADERS[2], width: 24 },
    { header: HEADERS[3], key: HEADERS[3], width: 36 },
  ];

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}