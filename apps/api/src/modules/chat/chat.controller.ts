import type { FastifyReply, FastifyRequest } from 'fastify';
import * as chatService from './chat.service.js';

export async function getMessages(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { roomCode: string };
  const query = request.query as { page?: string };
  const page = parseInt(query.page || '1', 10);
  const result = await chatService.getMessages(params.roomCode, request.userId!, page);
  return reply.send(result);
}
