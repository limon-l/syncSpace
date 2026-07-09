import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith('$')) continue;
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  if (typeof value === 'string') {
    return value.replace(/\$(?:gt|lt|gte|lte|ne|in|nin|regex|exists|where|and|or|nor)/g, '');
  }
  return value;
}

export const sanitizeInput = fp(async function (app: FastifyInstance) {
  app.addHook('preHandler', async (request) => {
    if (request.body && typeof request.body === 'object') {
      Object.assign(request.body, sanitizeValue(request.body) as Record<string, unknown>);
    }
    if (request.query && typeof request.query === 'object') {
      Object.assign(request.query, sanitizeValue(request.query) as Record<string, unknown>);
    }
    if (request.params && typeof request.params === 'object') {
      Object.assign(request.params, sanitizeValue(request.params) as Record<string, unknown>);
    }
  });
});
