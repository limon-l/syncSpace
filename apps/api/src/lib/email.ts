import nodemailer from 'nodemailer';
import { config } from './config.js';
import { logger } from './logger.js';

const FROM_ADDRESS = 'noreply@syncspace.app';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  if (config.SMTP_HOST && config.SMTP_PORT) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: config.SMTP_USER
        ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
        : undefined,
    });
  }

  return transporter;
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${config.APP_URL}/verify-email?token=${token}`;
  const transporter = getTransporter();

  if (transporter) {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: email,
      subject: 'Verify your SyncSpace account',
      html: `<p>Click <a href="${url}">here</a> to verify your email. This link expires in 24 hours.</p>`,
    });
  } else {
    logger.info({ email, url }, '[DEV] Verification email');
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${config.APP_URL}/reset-password?token=${token}`;
  const transporter = getTransporter();

  if (transporter) {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: email,
      subject: 'Reset your SyncSpace password',
      html: `<p>Click <a href="${url}">here</a> to reset your password. This link expires in 15 minutes.</p>`,
    });
  } else {
    logger.info({ email, url }, '[DEV] Password reset email');
  }
}
