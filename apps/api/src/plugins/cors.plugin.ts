import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../lib/config.js';

export async function registerCors(app: FastifyInstance) {
  const origins = config.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

  await app.register(cors, {
    origin: origins.length > 0 ? origins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    maxAge: 86400,
  });
}
