import crypto from 'node:crypto';
import argon2 from 'argon2';
import { User } from '../../models/user.model.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../lib/email.js';
import { logger } from '../../lib/logger.js';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function registerUser(email: string, password: string, displayName: string) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);

  const verificationToken = generateToken();
  const verificationTokenHash = hashToken(verificationToken);

  const user = await User.create({
    email,
    displayName,
    passwordHash,
    emailVerificationToken: verificationTokenHash,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  try {
    await sendVerificationEmail(email, verificationToken);
  } catch (error) {
    logger.error(error, 'Failed to send verification email');
  }

  return {
    userId: user._id.toString(),
    email: user.email,
  };
}

export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new ValidationError('Invalid or expired verification token');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  await user.save();

  return { userId: user._id.toString() };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const sessionToken = generateToken();
  const sessionTokenHash = hashToken(sessionToken);

  user.refreshTokens.push({
    tokenHash: sessionTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });

  if (user.refreshTokens.length > 10) {
    user.refreshTokens = user.refreshTokens.slice(-5);
  }

  await user.save();

  return {
    sessionToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

export async function logoutUser(userId: string, sessionToken: string) {
  const tokenHash = hashToken(sessionToken);
  await User.updateOne(
    { _id: userId },
    { $pull: { refreshTokens: { tokenHash } } },
  );
}

export async function validateSession(userId: string, sessionToken: string) {
  const tokenHash = hashToken(sessionToken);
  const user = await User.findOne({
    _id: userId,
    'refreshTokens.tokenHash': tokenHash,
    'refreshTokens.expiresAt': { $gt: new Date() },
  });

  if (!user) return null;

  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

export async function refreshSession(userId: string, oldSessionToken: string) {
  const oldTokenHash = hashToken(oldSessionToken);

  const user = await User.findOne({ _id: userId });
  if (!user) return null;

  const tokenIndex = user.refreshTokens.findIndex(
    (t) => t.tokenHash === oldTokenHash && t.expiresAt > new Date(),
  );
  if (tokenIndex === -1) return null;

  user.refreshTokens.splice(tokenIndex, 1);

  const newSessionToken = generateToken();
  const newTokenHash = hashToken(newSessionToken);

  user.refreshTokens.push({
    tokenHash: newTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });

  await user.save();

  return {
    sessionToken: newSessionToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email });
  if (!user) return;

  const resetToken = generateToken();
  user.passwordResetToken = hashToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  try {
    await sendPasswordResetEmail(email, resetToken);
  } catch (error) {
    logger.error(error, 'Failed to send password reset email');
  }
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new ValidationError('Invalid or expired reset token');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.refreshTokens = [];
  await user.save();

  return { userId: user._id.toString() };
}
