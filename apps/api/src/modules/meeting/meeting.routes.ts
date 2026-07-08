import type { FastifyInstance } from 'fastify';
import * as meetingController from './meeting.controller.js';
import { requireAuth } from '../../plugins/auth.plugin.js';

export async function meetingRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: [requireAuth] }, meetingController.createMeeting);
  app.get('/history', { preHandler: [requireAuth] }, meetingController.getHistory);
  app.get('/:roomCode', meetingController.getMeeting);
  app.post('/:roomCode/join', { preHandler: [requireAuth] }, meetingController.joinMeeting);
  app.post('/:roomCode/end', { preHandler: [requireAuth] }, meetingController.endMeeting);
  app.post('/:roomCode/lock', { preHandler: [requireAuth] }, meetingController.lockMeeting);
}
