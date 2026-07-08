import mongoose, { Schema, type Document } from 'mongoose';

export interface IMessage extends Document {
  meetingId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  content: string;
  type: 'text' | 'system';
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  meetingId: {
    type: Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderName: { type: String, required: true },
  content: { type: String, required: true, maxlength: 2000 },
  type: { type: String, enum: ['text', 'system'], default: 'text' },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ meetingId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
