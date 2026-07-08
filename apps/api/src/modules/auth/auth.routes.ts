import type { FastifyInstance } from 'fastify';
import * as authController from './auth.controller.js';
import { requireAuth } from '../../plugins/auth.plugin.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', authController.register);
  app.get('/verify-email/:token', authController.verifyEmail);
  app.post('/login', authController.login);
  app.post('/logout', { preHandler: [requireAuth] }, authController.logout);
  app.get('/session', authController.getSession);
  app.post('/refresh', { preHandler: [requireAuth] }, authController.refreshSession);
  app.post('/forgot-password', authController.forgotPassword);
}
