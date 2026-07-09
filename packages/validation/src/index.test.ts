import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.js';
import {
  createMeetingSchema,
  roomCodeParam,
  joinMeetingSchema,
} from './meeting.js';
import {
  meetingJoinSchema,
  chatSendSchema,
  reactionSendSchema,
  mediaStateSchema,
} from './socket.js';

describe('registerSchema', () => {
  it('accepts valid input', () => {
    const result = registerSchema.safeParse({
      email: 'Test@Example.COM',
      password: 'StrongP1ss',
      displayName: '  Alice  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.displayName).toBe('Alice');
    }
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'StrongP1ss',
      displayName: 'Alice',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'Sh0rt',
      displayName: 'Alice',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'weakpass1',
      displayName: 'Alice',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'WEAKPASSs',
      displayName: 'Alice',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty display name', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'StrongP1ss',
      displayName: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid input', () => {
    const result = loginSchema.safeParse({
      email: '  Alice@Example.COM  ',
      password: 'anything',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('alice@example.com');
    }
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'a@b.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '  A@B.com  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('a@b.com');
    }
  });
});

describe('resetPasswordSchema', () => {
  it('accepts valid input', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      password: 'NewStr0ng',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak password', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      password: 'weak',
    });
    expect(result.success).toBe(false);
  });
});

describe('createMeetingSchema', () => {
  it('uses defaults when omitted', () => {
    const result = createMeetingSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Meeting');
      expect(result.data.maxParticipants).toBe(8);
    }
  });

  it('accepts custom values', () => {
    const result = createMeetingSchema.safeParse({
      title: '  Standup  ',
      maxParticipants: 4,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Standup');
      expect(result.data.maxParticipants).toBe(4);
    }
  });
});

describe('roomCodeParam', () => {
  it('accepts 8-char code', () => {
    expect(roomCodeParam.safeParse({ roomCode: 'abcdef12' }).success).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(roomCodeParam.safeParse({ roomCode: 'abc' }).success).toBe(false);
  });
});

describe('joinMeetingSchema', () => {
  it('accepts valid name', () => {
    const result = joinMeetingSchema.safeParse({ displayName: '  Bob  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('Bob');
    }
  });
});

describe('socket schemas', () => {
  it('meetingJoinSchema accepts valid input', () => {
    const result = meetingJoinSchema.safeParse({
      roomCode: 'abcdef12',
      displayName: 'Alice',
    });
    expect(result.success).toBe(true);
  });

  it('chatSendSchema accepts valid message', () => {
    const result = chatSendSchema.safeParse({
      roomCode: 'abcdef12',
      content: 'Hello!',
    });
    expect(result.success).toBe(true);
  });

  it('chatSendSchema rejects empty message', () => {
    const result = chatSendSchema.safeParse({
      roomCode: 'abcdef12',
      content: '  ',
    });
    expect(result.success).toBe(false);
  });

  it('reactionSendSchema accepts valid reaction', () => {
    const result = reactionSendSchema.safeParse({
      roomCode: 'abcdef12',
      reaction: 'heart',
    });
    expect(result.success).toBe(true);
  });

  it('reactionSendSchema rejects invalid reaction', () => {
    const result = reactionSendSchema.safeParse({
      roomCode: 'abcdef12',
      reaction: 'foo',
    });
    expect(result.success).toBe(false);
  });

  it('mediaStateSchema accepts valid state', () => {
    const result = mediaStateSchema.safeParse({
      roomCode: 'abcdef12',
      isMuted: true,
      isCameraOff: false,
    });
    expect(result.success).toBe(true);
  });
});
