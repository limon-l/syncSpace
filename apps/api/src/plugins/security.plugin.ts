import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import { config } from '../lib/config.js';

export async function registerSecurity(app: FastifyInstance) {
  await app.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
}
