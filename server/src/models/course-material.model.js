import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export const COURSE_MATERIAL_TYPES = Object.freeze({
  DOCUMENT: 'DOCUMENT',
  VIDEO: 'VIDEO',
  EXTERNAL: 'EXTERNAL',
});

export const COURSE_MATERIAL_STATUSES = Object.freeze({
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
});

export const COURSE_MATERIAL_RESOURCE_TYPES = Object.freeze({
  IMAGE: 'image',
  RAW: 'raw',
  VIDEO: 'video',
});

const courseMaterialFileSchema = new Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },

    publicId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 512,
    },

    resourceType: {
      type: String,
      enum: {
        values: Object.values(COURSE_MATERIAL_RESOURCE_TYPES),
        message: 'Invalid Cloudinary resource type.',
      },
      required: true,
    },

    format: {
      type: String,
      trim: true,
      maxlength: 30,
      default: '',
    },

    mimeType: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },

    size: {
      type: Number,
      required: true,
      min: 1,
      max: 25 * 1024 * 1024,
    },
  },
  {
    _id: false,
    id: false,
    strict: 'throw',
  },
);

const courseMaterialSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required.'],
      immutable: true,
      index: true,
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required.'],
      immutable: true,
      index: true,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required.'],
      immutable: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Material title is required.'],
      trim: true,
      minlength: [2, 'Material title must contain at least 2 characters.'],
      maxlength: [120, 'Material title cannot exceed 120 characters.'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [
        2000,
        'Material description cannot exceed 2000 characters.',
      ],
      default: '',
    },

    moduleName: {
      type: String,
      required: [true, 'Module or chapter name is required.'],
      trim: true,
      minlength: [
        1,
        'Module or chapter name cannot be empty.',
      ],
      maxlength: [
        120,
        'Module or chapter name cannot exceed 120 characters.',
      ],
    },

    type: {
      type: String,
      enum: {
        values: Object.values(COURSE_MATERIAL_TYPES),
        message: 'Invalid course material type.',
      },
      required: true,
      index: true,
    },

    file: {
      type: courseMaterialFileSchema,
      default: null,
    },

    resourceUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
    },

    status: {
      type: String,
      enum: {
        values: Object.values(COURSE_MATERIAL_STATUSES),
        message: 'Invalid course material status.',
      },
      default: COURSE_MATERIAL_STATUSES.PUBLISHED,
      required: true,
      index: true,
    },

    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

courseMaterialSchema.pre('validate', function validateMaterialSource(next) {
  if (this.type === COURSE_MATERIAL_TYPES.DOCUMENT) {
    if (!this.file) {
      this.invalidate(
        'file',
        'A document file is required for document materials.',
      );
    }

    if (this.resourceUrl) {
      this.invalidate(
        'resourceUrl',
        'Document materials cannot use an external resource URL.',
      );
    }
  }

  if (
    this.type === COURSE_MATERIAL_TYPES.VIDEO
    || this.type === COURSE_MATERIAL_TYPES.EXTERNAL
  ) {
    if (!this.resourceUrl) {
      this.invalidate(
        'resourceUrl',
        'A valid resource URL is required.',
      );
    }

    if (this.file) {
      this.invalidate(
        'file',
        'External resources and video links cannot contain uploaded document files.',
      );
    }
  }

  if (
    this.resourceUrl
    && !/^https?:\/\/\S+$/i.test(this.resourceUrl)
  ) {
    this.invalidate(
      'resourceUrl',
      'Resource URL must use HTTP or HTTPS.',
    );
  }

  next();
});

courseMaterialSchema.index({
  course: 1,
  status: 1,
  createdAt: -1,
});

courseMaterialSchema.index({
  department: 1,
  course: 1,
  status: 1,
});

courseMaterialSchema.index({
  uploadedBy: 1,
  createdAt: -1,
});

courseMaterialSchema.index({
  course: 1,
  moduleName: 1,
  status: 1,
});

export const CourseMaterial =
  models.CourseMaterial
  || model('CourseMaterial', courseMaterialSchema);