import type { FastifyReply, FastifyRequest } from 'fastify';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@syncspace/validation';
import * as authService from './auth.service.js';
import { config } from '../../lib/config.js';

const COOKIE_OPTIONS: {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'none' | 'lax' | 'strict';
} = {
  path: '/',
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
};

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const body = registerSchema.parse(request.body);
  await authService.registerUser(body.email, body.password, body.displayName);
  return reply.status(201).send({ message: 'Verification email sent' });
}

export async function verifyEmail(
  request: FastifyRequest<{ Params: { token: string } }>,
  reply: FastifyReply,
) {
  const result = await authService.verifyEmail(request.params.token);
  return reply.send(result);
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const body = loginSchema.parse(request.body);
  const result = await authService.loginUser(body.email, body.password);

  const cookieValue = `${result.user.id}:${result.sessionToken}`;
  reply.setCookie('session_token', cookieValue, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60,
  });

  return reply.send({
    user: result.user,
    expiresAt: result.expiresAt,
  });
}

function parseSessionCookie(cookie: string | undefined): { userId: string; token: string } | null {
  if (!cookie) return null;
  const parts = cookie.split(':');
  if (parts.length !== 2) return null;
  return { userId: parts[0], token: parts[1] };
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const parsed = parseSessionCookie(request.cookies.session_token);

  if (parsed) {
    await authService.logoutUser(parsed.userId, parsed.token);
  }

  reply.clearCookie('session_token', COOKIE_OPTIONS);
  return reply.send({ success: true });
}

export async function getSession(request: FastifyRequest, reply: FastifyReply) {
  const parsed = parseSessionCookie(request.cookies.session_token);

  if (!parsed) {
    return reply.send({ user: null });
  }

  const user = await authService.validateSession(parsed.userId, parsed.token);
  if (!user) {
    reply.clearCookie('session_token', COOKIE_OPTIONS);
    return reply.send({ user: null });
  }

  return reply.send({ user });
}

export async function refreshSession(request: FastifyRequest, reply: FastifyReply) {
  const parsed = parseSessionCookie(request.cookies.session_token);

  if (!parsed) {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'No session' });
  }

  const result = await authService.refreshSession(parsed.userId, parsed.token);
  if (!result) {
    reply.clearCookie('session_token', COOKIE_OPTIONS);
    return reply.status(401).send({ code: 'SESSION_EXPIRED', message: 'Session expired' });
  }

  const cookieValue = `${result.user.id}:${result.sessionToken}`;
  reply.setCookie('session_token', cookieValue, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60,
  });

  return reply.send({
    user: result.user,
    expiresAt: result.expiresAt,
  });
}

export async function forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const body = forgotPasswordSchema.parse(request.body);
  await authService.forgotPassword(body.email);
  return reply.send({ message: 'If the email exists, a reset link has been sent' });
}

export async function resetPassword(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { token: string };
  const { password } = resetPasswordSchema.parse(request.body);
  const result = await authService.resetPassword(params.token, password);
  return reply.send(result);
}
