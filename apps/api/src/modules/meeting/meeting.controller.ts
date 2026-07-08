import type { FastifyReply, FastifyRequest } from 'fastify';
import { createMeetingSchema, joinMeetingSchema, roomCodeParam } from '@syncspace/validation';
import * as meetingService from './meeting.service.js';

export async function createMeeting(request: FastifyRequest, reply: FastifyReply) {
  const body = createMeetingSchema.parse(request.body);
  const result = await meetingService.createMeeting(
    request.user!,
    body.title,
    body.maxParticipants,
  );
  return reply.status(201).send(result);
}

export async function getMeeting(request: FastifyRequest, reply: FastifyReply) {
  const { roomCode } = roomCodeParam.parse(request.params);
  const result = await meetingService.getMeeting(roomCode);
  return reply.send(result);
}

export async function joinMeeting(request: FastifyRequest, reply: FastifyReply) {
  const { roomCode } = roomCodeParam.parse(request.params);
  joinMeetingSchema.parse(request.body);
  const result = await meetingService.joinMeeting(roomCode, request.userId!);
  return reply.send(result);
}

export async function endMeeting(request: FastifyRequest, reply: FastifyReply) {
  const { roomCode } = roomCodeParam.parse(request.params);
  const result = await meetingService.endMeeting(roomCode, request.userId!);
  return reply.send(result);
}

export async function lockMeeting(request: FastifyRequest, reply: FastifyReply) {
  const { roomCode } = roomCodeParam.parse(request.params);
  const body = request.body as { lock: boolean };
  const result = await meetingService.lockMeeting(roomCode, request.userId!, body.lock);
  return reply.send(result);
}

export async function getHistory(request: FastifyRequest, reply: FastifyReply) {
  const result = await meetingService.getMeetingHistory(request.userId!);
  return reply.send(result);
}
