import type { FastifyInstance } from 'fastify';
import * as chatController from './chat.controller.js';
import { requireAuth } from '../../plugins/auth.plugin.js';

export async function chatRoutes(app: FastifyInstance) {
  app.get('/:roomCode/messages', { preHandler: [requireAuth] }, chatController.getMessages);
}
