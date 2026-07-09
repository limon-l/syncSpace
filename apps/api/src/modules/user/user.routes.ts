import type { FastifyInstance } from 'fastify';
import * as userController from './user.controller.js';
import { requireAuth } from '../../plugins/auth.plugin.js';

export async function userRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: [requireAuth] }, userController.getProfile);
  app.patch('/me', { preHandler: [requireAuth] }, userController.updateProfile);
  app.get('/search', { preHandler: [requireAuth] }, userController.searchUsers);
}
