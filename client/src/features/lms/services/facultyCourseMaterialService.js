import api from '../../auth/services/api/axios.js';

const COURSE_ENDPOINT = '/v1/courses';

const MATERIAL_TYPES = Object.freeze({
  document: 'DOCUMENT',
  video: 'VIDEO',
  external: 'EXTERNAL',
});

function getErrorMessage(error) {
  return (
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.message
    || 'The course material request could not be completed.'
  );
}

function unwrapResponse(response) {
  const payload = response?.data;

  if (payload?.success !== true) {
    throw new Error(getErrorMessage({
      response: { data: payload },
    }));
  }

  return payload.data;
}

function normalizeCourseId(courseId) {
  const id = String(courseId || '').trim();

  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new Error('A valid course ID is required.');
  }

  return id;
}

function normalizeMaterialType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  const materialType = MATERIAL_TYPES[normalized];

  if (!materialType) {
    throw new Error('Choose a supported course material type.');
  }

  return materialType;
}

function normalizeMaterial(material) {
  if (!material || typeof material !== 'object') {
    throw new Error('The server returned an invalid material record.');
  }

  return {
    id: String(material.id || ''),
    courseId: String(material.courseId || ''),
    departmentId: String(material.departmentId || ''),
    uploadedBy: String(material.uploadedBy || ''),
    title: material.title || '',
    description: material.description || '',
    moduleName: material.moduleName || '',
    type: String(material.type || '').toLowerCase(),
    status: material.status || '',
    file: material.file || null,
    resourceUrl: material.resourceUrl || '',
    createdAt: material.createdAt || null,
    updatedAt: material.updatedAt || null,
    archivedAt: material.archivedAt || null,
  };
}

const facultyCourseMaterialService = {
  async listMaterials(courseId, options = {}) {
    const id = normalizeCourseId(courseId);

    const params = {};

    if (options.page !== undefined) {
      params.page = options.page;
    }

    if (options.limit !== undefined) {
      params.limit = options.limit;
    }

    if (options.type && options.type !== 'all') {
      params.type = normalizeMaterialType(options.type);
    }

    if (options.moduleName) {
      params.moduleName = options.moduleName;
    }

    const response = await api.get(
      `${COURSE_ENDPOINT}/${id}/materials`,
      {
        params,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );

    const data = unwrapResponse(response);

    if (!Array.isArray(data?.items)) {
      throw new Error('The server returned an invalid materials list.');
    }

    return {
      items: data.items.map(normalizeMaterial),
      pagination: data.pagination || {
        page: 1,
        limit: data.items.length,
        total: data.items.length,
        totalPages: data.items.length ? 1 : 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  },

  async getMaterial(courseId, materialId, options = {}) {
    const course = normalizeCourseId(courseId);
    const material = normalizeCourseId(materialId);

    const response = await api.get(
      `${COURSE_ENDPOINT}/${course}/materials/${material}`,
      options.signal ? { signal: options.signal } : undefined,
    );

    const data = unwrapResponse(response);

    return normalizeMaterial(data.material);
  },

  async createMaterial(courseId, materialData) {
    const id = normalizeCourseId(courseId);

    if (!materialData || typeof materialData !== 'object') {
      throw new Error('Valid course material information is required.');
    }

    const type = normalizeMaterialType(materialData.type);

    const formData = new FormData();

    formData.append('title', String(materialData.title || '').trim());
    formData.append(
      'description',
      String(materialData.description || '').trim(),
    );
    formData.append(
      'moduleName',
      String(materialData.moduleName || '').trim(),
    );
    formData.append('type', type);

    if (type === 'DOCUMENT') {
      if (!(materialData.file instanceof File)) {
        throw new Error('Choose a document file to upload.');
      }

      formData.append('file', materialData.file);
    } else {
      const resourceUrl = String(materialData.resourceUrl || '').trim();

      if (!resourceUrl) {
        throw new Error('A resource URL is required.');
      }

      formData.append('resourceUrl', resourceUrl);
    }

    const response = await api.post(
      `${COURSE_ENDPOINT}/${id}/materials`,
      formData,
    );

    const data = unwrapResponse(response);

    return normalizeMaterial(data.material);
  },

  async archiveMaterial(courseId, materialId) {
    const course = normalizeCourseId(courseId);
    const material = normalizeCourseId(materialId);

    const response = await api.patch(
      `${COURSE_ENDPOINT}/${course}/materials/${material}/archive`,
      {},
    );

    const data = unwrapResponse(response);

    return normalizeMaterial(data.material);
  },
};

export default facultyCourseMaterialService;