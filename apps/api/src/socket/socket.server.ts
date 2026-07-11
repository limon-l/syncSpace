import { Server as SocketServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { validateSession } from '../modules/auth/auth.service.js';
import { registerPresenceHandlers } from './handlers/presence.handler.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import { registerReactionHandlers } from './handlers/reaction.handler.js';
import { registerHostActionHandlers } from './handlers/host-actions.handler.js';
import { registerMediaHandlers } from './handlers/media.handler.js';

const vercelAppRegex = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/;

function resolveSocketOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = config.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  if (allowed.includes(origin)) return true;
  if (vercelAppRegex.test(origin)) return true;
  return false;
}

export interface SocketUser {
  id: string;
  displayName: string;
  email: string;
}

function parseSessionCookie(cookieHeader: string | undefined): { userId: string; token: string } | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/session_token=([^;]+)/);
  if (!match) return null;
  const decoded = decodeURIComponent(match[1]);
  const parts = decoded.split(':');
  if (parts.length !== 2) return null;
  return { userId: parts[0], token: parts[1] };
}

declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketServer;
  }
}

export function createSocketServer(app: FastifyInstance) {
  const io = new SocketServer(app.server, {
    cors: {
      origin: resolveSocketOrigin,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(async (socket, next) => {
    const cookie = socket.handshake.headers?.cookie;
    const parsed = parseSessionCookie(cookie);

    if (!parsed) {
      return next(new Error('UNAUTHORIZED'));
    }

    try {
      const user = await validateSession(parsed.userId, parsed.token);
      if (!user) {
        return next(new Error('UNAUTHORIZED'));
      }
      (socket as unknown as Record<string, unknown>).user = user;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  app.io = io;

  io.on('connection', (socket) => {
    const user = (socket as unknown as { user: SocketUser }).user;
    logger.info({ userId: user.id }, 'Socket connected');

    registerPresenceHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerReactionHandlers(io, socket);
    registerHostActionHandlers(io, socket);
    registerMediaHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info({ userId: user.id }, 'Socket disconnected');
    });
  });

  return io;
}
