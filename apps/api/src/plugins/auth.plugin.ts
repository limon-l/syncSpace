import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { validateSession } from '../modules/auth/auth.service.js';
import type { IUser } from '../models/user.model.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    user?: IUser;
  }
}

export const authPlugin = fp(async function (app: FastifyInstance) {
  app.decorateRequest('userId', undefined);
  app.decorateRequest('user', undefined);

  app.addHook('onRequest', async (request: FastifyRequest) => {
    const cookie = request.cookies.session_token;
    if (!cookie) return;

    const [userId, sessionToken] = cookie.split(':');
    if (!userId || !sessionToken) return;

    const user = await validateSession(userId, sessionToken);
    if (!user) return;

    request.userId = user.id;
    request.user = { _id: user.id, email: user.email, displayName: user.displayName, role: user.role } as unknown as IUser;
  });
});

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.userId) {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
}
