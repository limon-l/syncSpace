import mongoose, { Schema, type Document } from 'mongoose';

export interface IInvitation extends Document {
  meetingId: mongoose.Types.ObjectId;
  invitedEmail: string | null;
  invitedUserId: mongoose.Types.ObjectId | null;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const invitationSchema = new Schema<IInvitation>({
  meetingId: {
    type: Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true,
  },
  invitedEmail: { type: String, default: null },
  invitedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

invitationSchema.index({ token: 1 });
invitationSchema.index({ meetingId: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Invitation = mongoose.model<IInvitation>('Invitation', invitationSchema);
