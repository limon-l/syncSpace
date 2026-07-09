import fs from 'node:fs/promises';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireAuth } from '../../plugins/auth.plugin.js';
import { Meeting } from '../../models/meeting.model.js';
import { saveFile, listFiles, getFile, deleteFile } from './files.service.js';

export async function fileRoutes(app: FastifyInstance) {
  await app.register(import('@fastify/multipart'), {
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  app.post(
    '/api/meetings/:roomCode/files',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as { roomCode: string };
      const { roomCode } = params;
      const userId = request.userId!;
      const user = request.user!;

      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) {
        return reply.status(404).send({ error: 'Meeting not found' });
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const buffer = await data.toBuffer();
      const result = await saveFile(
        meeting._id,
        { id: userId, displayName: user.displayName },
        data.filename,
        data.mimetype,
        buffer,
      );

      app.io?.to(`meeting:${roomCode}`).emit('file:shared', result);

      return reply.status(201).send(result);
    },
  );

  app.get(
    '/api/meetings/:roomCode/files',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as { roomCode: string };
      const { roomCode } = params;

      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) {
        return reply.status(404).send({ error: 'Meeting not found' });
      }

      const files = await listFiles(meeting._id);
      return reply.send(files);
    },
  );

  app.get(
    '/api/meetings/:roomCode/files/:fileId',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as { roomCode: string; fileId: string };
      const { fileId } = params;

      try {
        const file = await getFile(fileId);
        const buffer = await fs.readFile(file.storagePath);
        return reply
          .header('Content-Type', file.mimeType)
          .header('Content-Disposition', `attachment; filename="${file.fileName}"`)
          .send(buffer);
      } catch {
        return reply.status(404).send({ error: 'File not found' });
      }
    },
  );

  app.delete(
    '/api/meetings/:roomCode/files/:fileId',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as { roomCode: string; fileId: string };
      const { fileId } = params;
      const userId = request.userId!;

      try {
        await deleteFile(fileId, userId);
        return reply.send({ success: true });
      } catch {
        return reply.status(404).send({ error: 'File not found' });
      }
    },
  );
}
