import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import {
  ensureUsersTable,
  mapUserRow,
  USERS_TABLE_NAME,
  USERS_TABLE_SCHEMA,
} from '@/lib/usersTable';
import { resolveSessionEmail } from '@/lib/sessionUser';

type ReportIssueBody = {
  extinguisherId?: string;
  plant?: string;
  plantCode?: string;
  /** Single-line summary (optional if structured fields are sent). */
  reportedBy?: string;
  reporterUsername?: string;
  reporterDisplayName?: string;
  reporterEmail?: string;
  note?: string;
};

function normCode(c: string) {
  return c.trim().toUpperCase();
}

function isPlantHeadRole(role: string) {
  const r = role.toLowerCase();
  return r.includes('plant head') || (r.includes('plant') && r.includes('head'));
}

function mergeUniqueEmails(...groups: Array<(string | undefined | null)[]>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const raw of group) {
      const e = typeof raw === 'string' ? raw.trim() : '';
      if (!e || !e.includes('@')) continue;
      const key = e.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

function pickRecipients(users: ReturnType<typeof mapUserRow>[], plantCode: string) {
  const code = normCode(plantCode);

  const byPlant = users.filter((u) => {
    if (!u.isLdapActive || !u.email || !isPlantHeadRole(u.role)) return false;
    const assigned = normCode(u.assignedPlantCode || '');
    if (!assigned) {
      return true;
    }
    if (!code) {
      return false;
    }
    return assigned === code;
  });

  if (byPlant.length > 0) return byPlant;

  const fallback = users.find((u) => u.email.toLowerCase() === 'ashwinisargar18@gmail.com');
  if (fallback) return [fallback];

  return [];
}

export async function POST(request: Request) {
  try {
    await ensureUsersTable();
    const body = (await request.json()) as ReportIssueBody;

    const extinguisherId = body.extinguisherId?.trim().toUpperCase();
    const plant = body.plant?.trim() || '';
    const plantCode = body.plantCode?.trim().toUpperCase() || '';
    const note = body.note?.trim() || 'Cylinder reported empty.';

    const reporterEmailRaw = body.reporterEmail?.trim();
    const fromUsername = resolveSessionEmail(body.reporterUsername);
    const reporterEmail =
      (reporterEmailRaw && reporterEmailRaw.includes('@') ? reporterEmailRaw : null) ||
      fromUsername ||
      null;
    const displayName =
      body.reporterDisplayName?.trim() ||
      body.reporterUsername?.trim() ||
      '';
    const reportedBy =
      body.reportedBy?.trim() ||
      (displayName && reporterEmail
        ? `${displayName} (${reporterEmail})`
        : reporterEmail || displayName || 'Unknown user');

    if (!extinguisherId) {
      return NextResponse.json({ message: 'extinguisherId is required' }, { status: 400 });
    }

    const userRows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, empId, username, email, role, assignedPlantCode, isLdapActive
        FROM ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME}
      `
    )) as Array<Record<string, unknown>>;
    const users = userRows.map(mapUserRow);

    const recipients = pickRecipients(users, plantCode);
    const fromPlantAdmins = recipients.map((u) => u.email).filter(Boolean);
    const fromPlantIssueFallback =
      process.env.PLANT_ISSUE_FALLBACK_EMAIL?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    /** Always notify this inbox (comma-separated). Defaults so reports are not dropped when DB roles do not match. */
    const fromIssueNotify =
      process.env.ISSUE_NOTIFY_EMAIL?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    const defaultNotify =
      fromIssueNotify.length > 0 ? fromIssueNotify : ['ashwinisargar18@gmail.com'];

    // Also send a copy to the reporting user (when email is known),
    // so they receive full issue details in their inbox.
    let recipientEmails = mergeUniqueEmails(
      fromPlantAdmins,
      fromPlantIssueFallback,
      defaultNotify,
      reporterEmail ? [reporterEmail] : []
    );

    if (recipientEmails.length === 0) {
      recipientEmails = mergeUniqueEmails(['ashwinisargar18@gmail.com']);
    }

    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    const from = (process.env.SMTP_FROM || user || 'noreply@nuvoco.local').trim();

    const subject = `[Nuvoco Fire Safety] Empty cylinder reported - ${extinguisherId}`;
    const text = [
      'An empty extinguisher cylinder has been reported.',
      `Extinguisher ID: ${extinguisherId}`,
      `Plant: ${plant || 'N/A'} (${plantCode || 'N/A'})`,
      `Reported by: ${reportedBy}`,
      reporterEmail ? `Reporter email: ${reporterEmail}` : 'Reporter email: (not provided)',
      displayName ? `Reporter display name: ${displayName}` : null,
      body.reporterUsername?.trim() ? `Reporter username: ${body.reporterUsername.trim()}` : null,
      `Note: ${note}`,
      `Time: ${new Date().toISOString()}`,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n');

    if (!host || !user || !pass) {
      console.warn(
        `[empty-cylinder] SMTP not configured (need SMTP_HOST, SMTP_USER, SMTP_PASS). Would send to: ${recipientEmails.join(', ')}. Subject: ${subject}`
      );
      return NextResponse.json(
        {
          ok: true,
          simulated: true,
          message:
            'No email was sent. Add SMTP_HOST, SMTP_USER, and SMTP_PASS to your .env file (use a Gmail App Password if using Gmail). Until then, only a simulated response is returned.',
          recipients: recipientEmails,
          smtpConfigured: false,
        },
        { status: 202 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      ...(host.includes('gmail.com')
        ? {
            tls: { rejectUnauthorized: true },
          }
        : {}),
    });

    try {
      await transporter.sendMail({
        from,
        to: recipientEmails.join(','),
        replyTo: reporterEmail || undefined,
        subject,
        text,
      });
    } catch (mailErr) {
      console.error('[empty-cylinder] sendMail failed:', mailErr);
      return NextResponse.json(
        {
          ok: false,
          message:
            'SMTP is set but sending failed. For Gmail use an App Password (Google Account → Security → App passwords), SMTP_HOST=smtp.gmail.com, port 587 or 465.',
          detail: process.env.NODE_ENV === 'development' ? String(mailErr) : undefined,
          recipients: recipientEmails,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        simulated: false,
        message: `Issue reported and email sent to ${recipientEmails.join(', ')}`,
        recipients: recipientEmails,
        smtpConfigured: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to report empty cylinder issue', error);
    return NextResponse.json({ message: 'Failed to report empty cylinder issue' }, { status: 500 });
  }
}
