import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const AUDIT_ACTORS = Object.freeze([
  'SUPER_ADMIN',
  'HOD',
  'FACULTY',
  'MENTOR',
  'STUDENT',
  'SYSTEM',
]);

const AUDIT_OUTCOMES = Object.freeze([
  'SUCCESS',
  'FAILURE',
]);

const auditEventSchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    actorRole: {
      type: String,
      enum: {
        values: AUDIT_ACTORS,
        message: 'Invalid audit actor role.',
      },
      default: 'SYSTEM',
      required: true,
    },

    action: {
      type: String,
      required: [true, 'Audit action is required.'],
      trim: true,
      minlength: [2, 'Audit action must contain at least 2 characters.'],
      maxlength: [120, 'Audit action cannot exceed 120 characters.'],
    },

    resourceType: {
      type: String,
      required: [true, 'Resource type is required.'],
      trim: true,
      minlength: [2, 'Resource type must contain at least 2 characters.'],
      maxlength: [100, 'Resource type cannot exceed 100 characters.'],
    },

    resourceId: {
      type: String,
      trim: true,
      maxlength: [150, 'Resource ID cannot exceed 150 characters.'],
      default: null,
    },

    outcome: {
      type: String,
      enum: {
        values: AUDIT_OUTCOMES,
        message: 'Invalid audit outcome.',
      },
      required: true,
    },

    requestId: {
      type: String,
      trim: true,
      maxlength: [150, 'Request ID cannot exceed 150 characters.'],
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },

    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

auditEventSchema.index({
  actorId: 1,
  occurredAt: -1,
});

auditEventSchema.index({
  resourceType: 1,
  resourceId: 1,
  occurredAt: -1,
});

auditEventSchema.index({
  action: 1,
  occurredAt: -1,
});

const AuditEvent =
  models.AuditEvent || model('AuditEvent', auditEventSchema);

export {
  AUDIT_ACTORS,
  AUDIT_OUTCOMES,
};

export default AuditEvent;