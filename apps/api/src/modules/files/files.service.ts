import path from 'node:path';
import fs from 'node:fs/promises';
import { nanoid } from 'nanoid';
import { SharedFile } from '../../models/file.model.js';
import { NotFoundError } from '../../lib/errors.js';
import type mongoose from 'mongoose';

const UPLOAD_DIR = './uploads';

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveFile(
  meetingId: mongoose.Types.ObjectId,
  user: { id: string; displayName: string },
  fileName: string,
  mimeType: string,
  buffer: Buffer,
) {
  await ensureUploadDir();

  const safeName = `${nanoid(16)}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storagePath = path.join(UPLOAD_DIR, safeName);
  await fs.writeFile(storagePath, buffer);

  const file = await SharedFile.create({
    meetingId,
    uploadedBy: user.id,
    uploaderName: user.displayName,
    fileName,
    fileSize: buffer.length,
    mimeType,
    storagePath,
  });

  return {
    id: file._id.toString(),
    fileName: file.fileName,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    uploadedBy: file.uploadedBy.toString(),
    uploaderName: file.uploaderName,
    createdAt: file.createdAt.toISOString(),
  };
}

export async function listFiles(meetingId: mongoose.Types.ObjectId) {
  const files = await SharedFile.find({ meetingId })
    .sort({ createdAt: -1 })
    .limit(50);

  return files.map((f) => ({
    id: f._id.toString(),
    fileName: f.fileName,
    fileSize: f.fileSize,
    mimeType: f.mimeType,
    uploadedBy: f.uploadedBy.toString(),
    uploaderName: f.uploaderName,
    createdAt: f.createdAt.toISOString(),
  }));
}

export async function getFile(fileId: string) {
  const file = await SharedFile.findById(fileId);
  if (!file) throw new NotFoundError('File not found');

  return {
    id: file._id.toString(),
    fileName: file.fileName,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    storagePath: file.storagePath,
    uploadedBy: file.uploadedBy.toString(),
  };
}

export async function deleteFile(fileId: string, userId: string) {
  const file = await SharedFile.findById(fileId);
  if (!file) throw new NotFoundError('File not found');
  if (file.uploadedBy.toString() !== userId) {
    throw new Error('Not authorized to delete this file');
  }

  await fs.unlink(file.storagePath).catch(() => {});
  await SharedFile.deleteOne({ _id: fileId });
}
