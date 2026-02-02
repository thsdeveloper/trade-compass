import { Resend } from 'resend';

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// For development, use Resend's test domain: onboarding@resend.dev
// For production, configure EMAIL_FROM with your verified domain
export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'Trade Compass <onboarding@resend.dev>',
  replyTo: process.env.EMAIL_REPLY_TO,
};
