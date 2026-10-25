import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const NOTIFICATION_TYPES = Object.freeze([
  'system',
  'announcement',
  'academic',
  'attendance',
  'assignment',
  'result',
  'message',
  'reminder',
]);

const NOTIFICATION_PRIORITIES = Object.freeze([
  'low',
  'normal',
  'high',
  'urgent',
]);

const notificationSchema = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    priority: {
      type: String,
      enum: NOTIFICATION_PRIORITIES,
      default: 'normal',
      required: true,
    },

    resource: {
      type: {
        type: String,
        trim: true,
        maxlength: 80,
        default: null,
      },

      id: {
        type: String,
        trim: true,
        maxlength: 128,
        default: null,
      },
    },

    actionUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },

    readAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
    minimize: true,
  },
);

notificationSchema.index({
  recipientId: 1,
  createdAt: -1,
});

notificationSchema.index({
  recipientId: 1,
  readAt: 1,
  createdAt: -1,
});

notificationSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      expiresAt: { $type: 'date' },
    },
  },
);

notificationSchema.index({
  actorId: 1,
  createdAt: -1,
});

const Notification = models.Notification
  || model('Notification', notificationSchema);

export {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
};

export default Notification;