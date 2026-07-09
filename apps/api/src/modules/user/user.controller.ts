import type { FastifyReply, FastifyRequest } from 'fastify';
import * as userService from './user.service.js';

export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  const result = await userService.getProfile(request.userId!);
  return reply.send(result);
}

export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { displayName?: string };
  const result = await userService.updateProfile(request.userId!, body);
  return reply.send(result);
}

export async function searchUsers(request: FastifyRequest, reply: FastifyReply) {
  const query = (request.query as { q?: string }).q || '';
  const result = await userService.searchUsers(query);
  return reply.send(result);
}
