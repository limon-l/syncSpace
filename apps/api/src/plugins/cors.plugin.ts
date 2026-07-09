import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../lib/config.js';

const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

const vercelAppRegex = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/;

export async function registerCors(app: FastifyInstance) {
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.length === 0) {
        return cb(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      if (vercelAppRegex.test(origin)) {
        return cb(null, true);
      }
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    maxAge: 86400,
  });
}
