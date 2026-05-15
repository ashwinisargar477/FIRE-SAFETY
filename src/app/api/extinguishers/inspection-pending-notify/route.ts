import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { createSmtpTransport, getSmtpEnv } from '@/lib/smtpTransport';
import {
  ensureExtinguisherTable,
  EXTINGUISHER_INSPECTION_DIGEST_META_TABLE,
  EXTINGUISHER_INSPECTION_TABLE_NAME,
  EXTINGUISHER_TABLE_NAME,
  EXTINGUISHER_TABLE_SCHEMA,
} from '@/lib/extinguisherTable';

const SCHEMA = EXTINGUISHER_TABLE_SCHEMA;
const EXT_TABLE = EXTINGUISHER_TABLE_NAME;
const INSP_TABLE = EXTINGUISHER_INSPECTION_TABLE_NAME;
const META_TABLE = EXTINGUISHER_INSPECTION_DIGEST_META_TABLE;
const META_KEY = 'inspection_pending_digest_v1';

function mergeRecipientEmails(): string[] {
  const raw =
    process.env.INSPECTION_PENDING_ADMIN_EMAIL?.trim() ||
    process.env.ISSUE_NOTIFY_EMAIL?.trim() ||
    '';
  const fromEnv = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
  if (fromEnv.length > 0) return fromEnv;
  return ['ashwinisargar18@gmail.com'];
}

function digestThrottleHours(): number {
  const n = Number(process.env.INSPECTION_PENDING_DIGEST_HOURS);
  if (Number.isFinite(n) && n >= 1 && n <= 720) return n;
  return 24;
}

/**
 * When active extinguishers have no inspection in the last 3 months (and are past the new-install grace),
 * sends one digest email to admins. Throttled (default: once per 24h) via DB meta row.
 */
export async function POST() {
  try {
    await ensureExtinguisherTable();

    const pendingRows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          e.id,
          e.plant,
          e.plantCode,
          e.companyCode,
          e.locationWithElevation,
          DATE_FORMAT(inv.lastInspectionAt, '%Y-%m-%d %H:%i') AS lastInspectionAt,
          DATE_FORMAT(e.installedDate, '%Y-%m-%d') AS installedDate
        FROM ${SCHEMA}.${EXT_TABLE} e
        LEFT JOIN (
          SELECT extinguisherId, MAX(inspectedAt) AS lastInspectionAt
          FROM ${SCHEMA}.${INSP_TABLE}
          GROUP BY extinguisherId
        ) inv ON inv.extinguisherId = e.id
        WHERE e.archived_at IS NULL
          AND (
            (inv.lastInspectionAt IS NULL AND e.installedDate < DATE_SUB(NOW(), INTERVAL 3 MONTH))
            OR (inv.lastInspectionAt IS NOT NULL AND inv.lastInspectionAt < DATE_SUB(NOW(), INTERVAL 3 MONTH))
          )
        ORDER BY e.plant, e.id
      `
    )) as Array<Record<string, unknown>>;

    if (pendingRows.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: false,
        pendingCount: 0,
        message: 'No inspection-pending extinguishers.',
      });
    }

    const hours = digestThrottleHours();
    const metaRows = (await prisma.$queryRawUnsafe(
      `SELECT lastSentAt FROM ${SCHEMA}.${META_TABLE} WHERE metaKey = ? LIMIT 1`,
      META_KEY
    )) as Array<{ lastSentAt: Date | string }>;

    const lastSent = metaRows[0]?.lastSentAt;
    if (lastSent) {
      const last = new Date(lastSent);
      if (!Number.isNaN(last.getTime())) {
        const minNext = new Date(last.getTime() + hours * 60 * 60 * 1000);
        if (Date.now() < minNext.getTime()) {
          return NextResponse.json({
            ok: true,
            sent: false,
            skipped: true,
            pendingCount: pendingRows.length,
            nextDigestAfter: minNext.toISOString(),
            message: `Digest suppressed: last sent within ${hours}h.`,
          });
        }
      }
    }

    const recipients = mergeRecipientEmails();
    const smtpEnv = getSmtpEnv();
    const transport = createSmtpTransport();

    const lines = pendingRows.map((r) => {
      const id = String(r.id ?? '');
      const plant = String(r.plant ?? '');
      const code = String(r.plantCode ?? '');
      const loc = String(r.locationWithElevation ?? '');
      const last = r.lastInspectionAt != null ? String(r.lastInspectionAt) : '(never)';
      return `- ${id} | ${plant} (${code}) | last inspection: ${last} | location: ${loc}`;
    });

    const subject = `[Nuvoco Fire Safety] Inspection pending — ${pendingRows.length} extinguisher(s)`;
    const text = [
      'The following active extinguishers have no recorded inspection in the last 3 months (or were never inspected after the new-equipment grace period).',
      '',
      ...lines,
      '',
      `Generated: ${new Date().toISOString()}`,
      'Open the dashboard: Extinguisher Management → View QR → Inspection to record results.',
    ].join('\n');

    if (!smtpEnv || !transport) {
      console.warn(
        `[inspection-pending-notify] SMTP not configured. Would email ${recipients.join(', ')}. Pending: ${pendingRows.length}`
      );
      return NextResponse.json(
        {
          ok: true,
          sent: false,
          simulated: true,
          pendingCount: pendingRows.length,
          recipients,
          message:
            'No email sent: set SMTP_HOST, SMTP_USER, and SMTP_PASS (e.g. Microsoft 365 mailbox for reports@nuvoco.com).',
        },
        { status: 202 }
      );
    }

    try {
      await transport.sendMail({
        from: smtpEnv.from,
        to: recipients.join(','),
        subject,
        text,
      });
    } catch (mailErr) {
      console.error('[inspection-pending-notify] sendMail failed:', mailErr);
      return NextResponse.json(
        {
          ok: false,
          message: 'SMTP is configured but sending failed.',
          detail: process.env.NODE_ENV === 'development' ? String(mailErr) : undefined,
        },
        { status: 502 }
      );
    }

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO ${SCHEMA}.${META_TABLE} (metaKey, lastSentAt)
        VALUES (?, NOW())
        ON DUPLICATE KEY UPDATE lastSentAt = NOW()
      `,
      META_KEY
    );

    return NextResponse.json({
      ok: true,
      sent: true,
      pendingCount: pendingRows.length,
      recipients,
      message: `Digest sent to ${recipients.join(', ')}.`,
    });
  } catch (error) {
    console.error('inspection-pending-notify failed', error);
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to process inspection pending notification.',
        detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
