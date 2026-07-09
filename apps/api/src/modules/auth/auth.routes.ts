import type { FastifyInstance } from 'fastify';
import * as authController from './auth.controller.js';
import { requireAuth } from '../../plugins/auth.plugin.js';

const strictLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', strictLimit, authController.register);
  app.get('/verify-email/:token', authController.verifyEmail);
  app.post('/login', strictLimit, authController.login);
  app.post('/logout', { preHandler: [requireAuth] }, authController.logout);
  app.get('/session', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, authController.getSession);
  app.post('/refresh', { preHandler: [requireAuth] }, authController.refreshSession);
  app.post('/forgot-password', strictLimit, authController.forgotPassword);
  app.post('/reset-password/:token', strictLimit, authController.resetPassword);
}
