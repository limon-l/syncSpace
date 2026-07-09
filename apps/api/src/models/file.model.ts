import mongoose, { Schema, type Document } from 'mongoose';

export interface ISharedFile extends Document {
  meetingId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  uploaderName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  createdAt: Date;
}

const fileSchema = new Schema<ISharedFile>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploaderName: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    storagePath: { type: String, required: true },
  },
  { timestamps: true },
);

export const SharedFile = mongoose.model<ISharedFile>('SharedFile', fileSchema);
