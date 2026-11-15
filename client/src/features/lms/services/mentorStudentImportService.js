import api from '../../auth/services/api/axios.js';

const TEMPLATE_ENDPOINT =
  '/v1/provisioning/students/import-template';

const MAX_FILE_SIZE = 1024 * 1024;

function getResponseData(response) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message
        || payload?.message
        || 'Student import request failed.',
    );
  }

  return payload.data;
}

function validateSectionId(sectionId) {
  if (
    typeof sectionId !== 'string'
    || !/^[a-f\d]{24}$/i.test(sectionId)
  ) {
    throw new Error('Select a valid assigned section.');
  }

  return sectionId;
}

function validateFile(file) {
  if (!file) {
    throw new Error('Select a student import file.');
  }

  const extension = file.name
    .split('.')
    .pop()
    ?.toLowerCase();

  if (!['csv', 'xlsx'].includes(extension)) {
    throw new Error('Only CSV and XLSX files are supported.');
  }

  if (file.size === 0) {
    throw new Error('The selected file is empty.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('The maximum supported file size is 1 MB.');
  }

  return extension;
}

function createRequestBody(file, csvContent) {
  const extension = validateFile(file);

  if (extension === 'csv') {
    if (typeof csvContent !== 'string' || !csvContent.trim()) {
      throw new Error('Unable to read the CSV file.');
    }

    return {
      body: {
        csvContent,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  const formData = new FormData();

  formData.append('file', file);

  return {
    body: formData,
    headers: {},
  };
}

function normalizePreview(data) {
  if (
    !data
    || !data.summary
    || !Array.isArray(data.rows)
  ) {
    throw new Error(
      'The server returned an invalid import preview.',
    );
  }

  return {
    section: data.section,
    batch: data.batch,

    summary: {
      totalRows: Number(data.summary.totalRows ?? 0),
      readyCount: Number(data.summary.readyCount ?? 0),
      conflictCount: Number(data.summary.conflictCount ?? 0),
      canImport: Boolean(data.summary.canImport),
    },

    rows: data.rows.map((row) => ({
      row: Number(row.row),
      institutionalId: row.institutionalId ?? '',
      fullName: row.fullName ?? '',
      email: row.email ?? '',
      status: row.status ?? 'CONFLICT',
      conflicts: Array.isArray(row.conflicts)
        ? row.conflicts.map((conflict) => ({
            field: conflict.field,
            code: conflict.code,
            message: conflict.message,
          }))
        : [],
    })),
  };
}

function normalizeImportResult(data) {
  if (
    !data
    || !Array.isArray(data.students)
    || !Number.isFinite(Number(data.importedCount))
  ) {
    throw new Error(
      'The server returned an invalid import result.',
    );
  }

  return {
    sectionId: data.sectionId,
    batchId: data.batchId,
    importedCount: Number(data.importedCount),

    students: data.students.map((student) => ({
      id: String(student.id ?? ''),
      institutionalId: student.institutionalId ?? '',
      fullName: student.fullName ?? '',
      email: student.email ?? '',
    })),
  };
}

const mentorStudentImportService = {
  /**
   * Downloads the official backend-generated CSV template.
   *
   * GET /api/v1/provisioning/students/import-template
   */
  async downloadTemplate() {
    const response = await api.get(
      TEMPLATE_ENDPOINT,
      {
        params: {
          format: 'csv',
        },
      },
    );

    if (typeof response.data !== 'string') {
      throw new Error(
        'The server did not return a valid CSV template.',
      );
    }

    return response.data;
  },

  /**
   * Generates server-side preview.
   *
   * POST /api/v1/provisioning/sections/:sectionId/students/import-preview
   */
  async preview({
    sectionId,
    file,
    csvContent,
    signal,
  }) {
    const safeSectionId = validateSectionId(sectionId);

    const request = createRequestBody(file, csvContent);

    const response = await api.post(
      `/v1/provisioning/sections/${safeSectionId}/students/import-preview`,
      request.body,
      {
        headers: request.headers,
        ...(signal ? { signal } : {}),
      },
    );

    return normalizePreview(
      getResponseData(response),
    );
  },

  /**
   * Performs actual import with idempotency protection.
   *
   * POST /api/v1/provisioning/sections/:sectionId/students/import
   */
  async importStudents({
    sectionId,
    file,
    csvContent,
    idempotencyKey,
    signal,
  }) {
    const safeSectionId = validateSectionId(sectionId);

    if (
      typeof idempotencyKey !== 'string'
      || idempotencyKey.length < 16
      || idempotencyKey.length > 128
    ) {
      throw new Error('A valid import idempotency key is required.');
    }

    const request = createRequestBody(file, csvContent);

    const response = await api.post(
      `/v1/provisioning/sections/${safeSectionId}/students/import`,
      request.body,
      {
        headers: {
          ...request.headers,
          'Idempotency-Key': idempotencyKey,
        },

        ...(signal ? { signal } : {}),
      },
    );

    return {
      replayed: Boolean(response.data.replayed),
      message: response.data.message,
      data: normalizeImportResult(
        getResponseData(response),
      ),
    };
  },
};

export default mentorStudentImportService;