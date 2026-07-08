import mongoose, { Schema, type Document } from 'mongoose';

export interface IMeeting extends Document {
  roomCode: string;
  title: string;
  hostId: mongoose.Types.ObjectId;
  coHostIds: mongoose.Types.ObjectId[];
  status: 'active' | 'ended' | 'scheduled';
  isLocked: boolean;
  participantIds: mongoose.Types.ObjectId[];
  maxParticipants: number;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      length: 8,
    },
    title: {
      type: String,
      required: true,
      default: 'Meeting',
      maxlength: 100,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coHostIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'ended', 'scheduled'],
      default: 'active',
    },
    isLocked: { type: Boolean, default: false },
    participantIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    maxParticipants: { type: Number, default: 8, min: 2, max: 16 },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

meetingSchema.index({ roomCode: 1 });
meetingSchema.index({ hostId: 1, createdAt: -1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ participantIds: 1 });

export const Meeting = mongoose.model<IMeeting>('Meeting', meetingSchema);
