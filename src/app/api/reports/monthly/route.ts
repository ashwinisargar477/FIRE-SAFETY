import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ensureExtinguisherTable,
  EXTINGUISHER_TABLE_NAME,
  EXTINGUISHER_TABLE_SCHEMA,
} from '@/lib/extinguisherTable';

const PLANTS_TABLE = 'tbl_plants';

type MonthlyReportRow = {
  plantId: number;
  companyCode: string;
  plantCode: string;
  plantName: string;
  region: string;
  plantUnit: string;
  cluster: string;
  totalExtinguishers: number;
  installedInMonth: number;
  archivedCount: number;
  dueOrOverdueUt: number;
  dueOrOverdueHydraulic: number;
  dueIn30Days: number;
};

function resolveMonthParam(raw: string | null): string {
  if (!raw) return new Date().toISOString().slice(0, 7);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : new Date().toISOString().slice(0, 7);
}

export async function GET(request: NextRequest) {
  try {
    await ensureExtinguisherTable();

    const month = resolveMonthParam(request.nextUrl.searchParams.get('month'));
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          p.id AS plantId,
          p.companyCode,
          p.plantCode,
          p.plantOffice AS plantName,
          COALESCE(p.region, '') AS region,
          COALESCE(p.plant_unit, '') AS plantUnit,
          COALESCE(p.cluster, '') AS cluster,
          COUNT(e.id) AS totalExtinguishers,
          SUM(CASE WHEN DATE_FORMAT(e.installedDate, '%Y-%m') = ? THEN 1 ELSE 0 END) AS installedInMonth,
          SUM(CASE WHEN e.archived_at IS NOT NULL THEN 1 ELSE 0 END) AS archivedCount,
          SUM(CASE WHEN e.archived_at IS NULL AND e.nextUtTestDate <= CURDATE() THEN 1 ELSE 0 END) AS dueOrOverdueUt,
          SUM(CASE WHEN e.archived_at IS NULL AND e.hydraulicDueDate IS NOT NULL AND e.hydraulicDueDate <= CURDATE() THEN 1 ELSE 0 END) AS dueOrOverdueHydraulic,
          SUM(
            CASE
              WHEN e.archived_at IS NULL AND (
                (e.nextUtTestDate > CURDATE() AND e.nextUtTestDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY))
                OR (
                  e.hydraulicDueDate IS NOT NULL
                  AND e.hydraulicDueDate > CURDATE()
                  AND e.hydraulicDueDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                )
              )
              THEN 1
              ELSE 0
            END
          ) AS dueIn30Days
        FROM ${EXTINGUISHER_TABLE_SCHEMA}.${PLANTS_TABLE} p
        LEFT JOIN ${EXTINGUISHER_TABLE_SCHEMA}.${EXTINGUISHER_TABLE_NAME} e
          ON (e.plantId IS NOT NULL AND e.plantId = p.id)
          OR (e.companyCode = p.companyCode AND e.plantCode = p.plantCode)
        GROUP BY p.id, p.companyCode, p.plantCode, p.plantOffice, p.region, p.plant_unit, p.cluster
        ORDER BY p.id ASC
      `,
      month
    )) as Array<Record<string, unknown>>;

    const report = rows.map((row) => ({
      plantId: Number(row.plantId ?? 0),
      companyCode: String(row.companyCode ?? ''),
      plantCode: String(row.plantCode ?? ''),
      plantName: String(row.plantName ?? ''),
      region: String(row.region ?? ''),
      plantUnit: String(row.plantUnit ?? ''),
      cluster: String(row.cluster ?? ''),
      totalExtinguishers: Number(row.totalExtinguishers ?? 0),
      installedInMonth: Number(row.installedInMonth ?? 0),
      archivedCount: Number(row.archivedCount ?? 0),
      dueOrOverdueUt: Number(row.dueOrOverdueUt ?? 0),
      dueOrOverdueHydraulic: Number(row.dueOrOverdueHydraulic ?? 0),
      dueIn30Days: Number(row.dueIn30Days ?? 0),
    })) as MonthlyReportRow[];

    const totals = report.reduce(
      (acc, item) => {
        acc.totalExtinguishers += item.totalExtinguishers;
        acc.installedInMonth += item.installedInMonth;
        acc.archivedCount += item.archivedCount;
        acc.dueOrOverdueUt += item.dueOrOverdueUt;
        acc.dueOrOverdueHydraulic += item.dueOrOverdueHydraulic;
        acc.dueIn30Days += item.dueIn30Days;
        return acc;
      },
      {
        totalExtinguishers: 0,
        installedInMonth: 0,
        archivedCount: 0,
        dueOrOverdueUt: 0,
        dueOrOverdueHydraulic: 0,
        dueIn30Days: 0,
      }
    );

    return NextResponse.json({ month, report, totals }, { status: 200 });
  } catch (error) {
    console.error('Failed to generate monthly plant report', error);
    return NextResponse.json(
      { message: 'Failed to generate monthly plant report' },
      { status: 500 }
    );
  }
}
