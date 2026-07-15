import mongoose, { Schema, type Document } from 'mongoose';

export interface IParticipantSession extends Document {
  meetingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'host' | 'co-host' | 'participant';
  isMuted: boolean;
  isCameraOff: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  joinedAt: Date;
  leftAt: Date | null;
}

const participantSessionSchema = new Schema<IParticipantSession>({
  meetingId: {
    type: Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['host', 'co-host', 'participant'],
    default: 'participant',
  },
  isMuted: { type: Boolean, default: false },
  isCameraOff: { type: Boolean, default: true },
  isHandRaised: { type: Boolean, default: false },
  isScreenSharing: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date, default: null },
});

participantSessionSchema.index({ meetingId: 1, userId: 1 });
participantSessionSchema.index({ meetingId: 1, role: 1 });
participantSessionSchema.index({ userId: 1, leftAt: 1 });

export const ParticipantSession = mongoose.model<IParticipantSession>(
  'ParticipantSession',
  participantSessionSchema,
);
