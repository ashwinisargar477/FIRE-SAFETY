import 'server-only';
import nodemailer from 'nodemailer';

export type SmtpEnv = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export function getSmtpEnv(): SmtpEnv | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = (process.env.SMTP_FROM || user || 'noreply@nuvoco.local').trim();
  if (!host || !user || !pass) return null;
  return { host, port, user, pass, from };
}

export function createSmtpTransport(): nodemailer.Transporter | null {
  const env = getSmtpEnv();
  if (!env) return null;
  return nodemailer.createTransport({
    host: env.host,
    port: env.port,
    secure: env.port === 465,
    auth: { user: env.user, pass: env.pass },
    ...(env.host.includes('gmail.com')
      ? {
          tls: { rejectUnauthorized: true },
        }
      : {}),
  });
}
