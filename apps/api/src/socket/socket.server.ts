import { Server as SocketServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { registerPresenceHandlers } from './handlers/presence.handler.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import { registerReactionHandlers } from './handlers/reaction.handler.js';
import { registerHostActionHandlers } from './handlers/host-actions.handler.js';

export function createSocketServer(app: FastifyInstance) {
  const io = new SocketServer(app.server, {
    cors: {
      origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    const userId = socket.handshake.auth?.userId;

    if (!token || !userId) {
      return next(new Error('UNAUTHORIZED'));
    }

    try {
      const { validateSession } = await import('../modules/auth/auth.service.js');
      const user = await validateSession(userId, token);
      if (!user) {
        return next(new Error('UNAUTHORIZED'));
      }
      (socket as any).user = user;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    logger.info({ userId: user.id }, 'Socket connected');

    registerPresenceHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerReactionHandlers(io, socket);
    registerHostActionHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info({ userId: user.id }, 'Socket disconnected');
    });
  });

  return io;
}
