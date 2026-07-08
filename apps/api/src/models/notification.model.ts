import mongoose, { Schema, type Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'meeting_invite' | 'participant_joined' | 'meeting_ended' | 'role_changed' | 'removed_from_meeting';
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['meeting_invite', 'participant_joined', 'meeting_ended', 'role_changed', 'removed_from_meeting'],
    required: true,
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
