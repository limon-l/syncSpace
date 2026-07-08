import mongoose, { Schema, type Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  actorId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId | null;
  meetingId: mongoose.Types.ObjectId | null;
  metadata: Record<string, unknown>;
  ip: string;
  userAgent: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true },
  actorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetId: { type: Schema.Types.ObjectId, default: null },
  meetingId: { type: Schema.Types.ObjectId, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

auditLogSchema.index({ meetingId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
