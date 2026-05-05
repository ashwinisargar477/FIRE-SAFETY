import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ensureExtinguisherTable,
  EXTINGUISHER_TABLE_NAME,
  EXTINGUISHER_TABLE_SCHEMA,
} from '@/lib/extinguisherTable';

/** Rows that should trigger the overdue popup (UT and/or hydraulic). */
export type ExpiryAlertRow = {
  id: string;
  plant: string;
  plantOffice: string;
  nextUtTestDate: string;
  hydraulicDueDate: string | null;
  utOverdue: number | boolean;
  hydraulicOverdue: number | boolean;
  daysUtOverdue: number | null;
  daysHydraulicOverdue: number | null;
};

export type ExpiryRow = {
  id: string;
  plant: string;
  plantOffice: string;
  nextUtTestDate: string;
  daysUntil?: number;
};

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function toBool(value: unknown): boolean {
  if (value === true) return true;
  return Number(value) === 1;
}

export async function GET() {
  try {
    await ensureExtinguisherTable();

    const expiredRaw = (await prisma.$queryRawUnsafe(
      `
        SELECT
          e.id,
          e.plant,
          e.plantOffice,
          DATE_FORMAT(e.nextUtTestDate, '%Y-%m-%d') AS nextUtTestDate,
          DATE_FORMAT(e.hydraulicDueDate, '%Y-%m-%d') AS hydraulicDueDate,
          (e.nextUtTestDate <= CURDATE()) AS utOverdue,
          (e.hydraulicDueDate IS NOT NULL AND e.hydraulicDueDate <= CURDATE()) AS hydraulicOverdue,
          CASE WHEN e.nextUtTestDate <= CURDATE() THEN DATEDIFF(CURDATE(), e.nextUtTestDate) ELSE NULL END AS daysUtOverdue,
          CASE
            WHEN e.hydraulicDueDate IS NOT NULL AND e.hydraulicDueDate <= CURDATE()
            THEN DATEDIFF(CURDATE(), e.hydraulicDueDate)
            ELSE NULL
          END AS daysHydraulicOverdue
        FROM ${EXTINGUISHER_TABLE_SCHEMA}.${EXTINGUISHER_TABLE_NAME} e
        WHERE e.archived_at IS NULL
          AND (
            e.nextUtTestDate <= CURDATE()
            OR (e.hydraulicDueDate IS NOT NULL AND e.hydraulicDueDate <= CURDATE())
          )
        ORDER BY
          LEAST(
            e.nextUtTestDate,
            COALESCE(e.hydraulicDueDate, e.nextUtTestDate)
          ) ASC
      `
    )) as Array<Record<string, unknown>>;

    const dueSoonRaw = (await prisma.$queryRawUnsafe(
      `
        SELECT
          e.id,
          e.plant,
          e.plantOffice,
          DATE_FORMAT(e.nextUtTestDate, '%Y-%m-%d') AS nextUtTestDate,
          DATEDIFF(e.nextUtTestDate, CURDATE()) AS daysUntil
        FROM ${EXTINGUISHER_TABLE_SCHEMA}.${EXTINGUISHER_TABLE_NAME} e
        WHERE e.archived_at IS NULL
          AND e.nextUtTestDate > CURDATE()
          AND e.nextUtTestDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
          AND NOT (e.hydraulicDueDate IS NOT NULL AND e.hydraulicDueDate <= CURDATE())
        ORDER BY e.nextUtTestDate ASC
      `
    )) as Array<Record<string, unknown>>;

    const expired: ExpiryAlertRow[] = expiredRaw.map((row) => ({
      id: String(row.id ?? ''),
      plant: String(row.plant ?? ''),
      plantOffice: String(row.plantOffice ?? ''),
      nextUtTestDate: String(row.nextUtTestDate ?? ''),
      hydraulicDueDate: row.hydraulicDueDate ? String(row.hydraulicDueDate) : null,
      utOverdue: toBool(row.utOverdue),
      hydraulicOverdue: toBool(row.hydraulicOverdue),
      daysUtOverdue: toNumberOrNull(row.daysUtOverdue),
      daysHydraulicOverdue: toNumberOrNull(row.daysHydraulicOverdue),
    }));

    const dueSoon: ExpiryRow[] = dueSoonRaw.map((row) => ({
      id: String(row.id ?? ''),
      plant: String(row.plant ?? ''),
      plantOffice: String(row.plantOffice ?? ''),
      nextUtTestDate: String(row.nextUtTestDate ?? ''),
      daysUntil: toNumberOrNull(row.daysUntil) ?? undefined,
    }));

    return NextResponse.json(
      {
        expired,
        dueSoon,
        asOf: new Date().toISOString().slice(0, 10),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to compute extinguisher expiry', error);
    return NextResponse.json({ message: 'Failed to load expiry summary' }, { status: 500 });
  }
}
