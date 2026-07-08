import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../lib/config.js';

export async function registerCors(app: FastifyInstance) {
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });
}
