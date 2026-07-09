import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth.plugin.js';
import { generateLiveKitToken } from './livekit.service.js';

export async function liveKitRoutes(app: FastifyInstance) {
  app.get<{ Params: { roomName: string } }>(
    '/api/livekit/token/:roomName',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { roomName } = request.params;
      const userId = request.userId!;
      const user = request.user!;

      try {
        const token = await generateLiveKitToken(
          userId,
          user.displayName,
          roomName,
        );
        return reply.send({ token, url: process.env.LIVEKIT_URL || '' });
      } catch {
        return reply.status(500).send({ error: 'Failed to generate LiveKit token' });
      }
    },
  );
}
