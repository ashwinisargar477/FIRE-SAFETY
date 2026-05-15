import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { addYearsToIsoDate } from '@/lib/addYearsToIsoDate';
import {
  ensureExtinguisherTable,
  EXTINGUISHER_INSPECTION_TABLE_NAME,
  EXTINGUISHER_REL_TABLE_NAME,
  EXTINGUISHER_TABLE_NAME,
  EXTINGUISHER_TABLE_SCHEMA,
} from '@/lib/extinguisherTable';

const TABLE_SCHEMA = EXTINGUISHER_TABLE_SCHEMA;
const TABLE_NAME = EXTINGUISHER_TABLE_NAME;
const REL_TABLE_NAME = EXTINGUISHER_REL_TABLE_NAME;
const INSP_TABLE = EXTINGUISHER_INSPECTION_TABLE_NAME;

type UpdateBody = {
  division?: string;
  subDivision?: string;
  zone?: string;
  plantOffice?: string;
  plantId?: number | null;
  companyCode?: string;
  plantCode?: string;
  plant?: string;
  showStatus?: string;
  region?: string;
  plant_unit?: string;
  cluster?: string;
  company_name?: string;
  make?: string;
  type?: string;
  media?: string;
  capacity?: string;
  locationWithElevation?: string;
  lastUtTestDate?: string;
  manufacturingDate?: string;
  nextUtTestDate?: string;
  hydraulicDueDate?: string | null;
};

async function schemaHasPlantsTable(): Promise<boolean> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT 1 AS ok
        FROM information_schema.tables
        WHERE table_schema = ? AND LOWER(table_name) = LOWER(?)
        LIMIT 1
      `,
      TABLE_SCHEMA,
      'tbl_plants'
    )) as Array<{ ok: number }>;
    return rows.length > 0;
  } catch {
    return false;
  }
}

function extinguisherSelectFields(hasPlants: boolean): string {
  const showStatus = hasPlants
    ? `COALESCE(NULLIF(e.showStatus, ''), p.showStatus, 't') AS showStatus`
    : `COALESCE(NULLIF(e.showStatus, ''), 't') AS showStatus`;
  const region = hasPlants
    ? `COALESCE(NULLIF(e.region, ''), p.region, '') AS region`
    : `COALESCE(NULLIF(e.region, ''), '') AS region`;
  const plant_unit = hasPlants
    ? `COALESCE(NULLIF(e.plant_unit, ''), p.plant_unit, '') AS plant_unit`
    : `COALESCE(NULLIF(e.plant_unit, ''), '') AS plant_unit`;
  const cluster = hasPlants
    ? `COALESCE(NULLIF(e.cluster, ''), p.cluster, '') AS cluster`
    : `COALESCE(NULLIF(e.cluster, ''), '') AS cluster`;
  const company_name = hasPlants
    ? `COALESCE(NULLIF(e.company_name, ''), p.company_name, '') AS company_name`
    : `COALESCE(NULLIF(e.company_name, ''), '') AS company_name`;

  return `
          e.id,
          e.division,
          e.subDivision,
          e.zone,
          e.plantOffice,
          e.plantId,
          e.companyCode,
          e.plantCode,
          e.plant,
          ${showStatus},
          ${region},
          ${plant_unit},
          ${cluster},
          ${company_name},
          e.make,
          e.type,
          e.media,
          e.capacity,
          e.locationWithElevation,
          DATE_FORMAT(e.lastUtTestDate, '%Y-%m-%d') as lastUtTestDate,
          DATE_FORMAT(e.manufacturingDate, '%Y-%m-%d') as manufacturingDate,
          DATE_FORMAT(e.nextUtTestDate, '%Y-%m-%d') as nextUtTestDate,
          DATE_FORMAT(e.hydraulicDueDate, '%Y-%m-%d') as hydraulicDueDate,
          e.installedBy,
          DATE_FORMAT(e.installedDate, '%Y-%m-%dT%H:%i:%sZ') as installedDate,
          DATE_FORMAT(e.archived_at, '%Y-%m-%dT%H:%i:%sZ') as archivedAt,
          e.archived_reason as archivedReason`;
}

function extinguisherPlantJoin(hasPlants: boolean): string {
  if (!hasPlants) return '';
  return `
        LEFT JOIN ${TABLE_SCHEMA}.tbl_plants p
          ON p.id = e.plantId
          OR (p.companyCode = e.companyCode AND p.plantCode = e.plantCode)`;
}

function extinguisherInspectionJoin(): string {
  return `
        LEFT JOIN (
          SELECT extinguisherId, MAX(inspectedAt) AS lastInspectionAt
          FROM ${TABLE_SCHEMA}.${INSP_TABLE}
          GROUP BY extinguisherId
        ) inv ON inv.extinguisherId = e.id`;
}

function extinguisherInspectionSelect(): string {
  return `
          , DATE_FORMAT(inv.lastInspectionAt, '%Y-%m-%dT%H:%i:%sZ') AS lastInspectionAt
          , CASE
              WHEN e.archived_at IS NOT NULL THEN 0
              WHEN inv.lastInspectionAt IS NULL AND e.installedDate >= DATE_SUB(NOW(), INTERVAL 3 MONTH) THEN 0
              WHEN inv.lastInspectionAt IS NULL THEN 1
              WHEN inv.lastInspectionAt < DATE_SUB(NOW(), INTERVAL 3 MONTH) THEN 1
              ELSE 0
            END AS inspectionPending`;
}

function mapExtinguisherApiRow(row: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!row) return null;
  return {
    ...row,
    lastInspectionAt: row.lastInspectionAt ?? null,
    inspectionPending: Number(row.inspectionPending) === 1,
  };
}

async function upsertRelation(
  extinguisherId: string,
  plantId: number | null,
  companyCode: string,
  plantCode: string
) {
  if (!plantId) return;
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO ${TABLE_SCHEMA}.${REL_TABLE_NAME}
      (extinguisherId, plantId, companyCode, plantCode)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      companyCode = VALUES(companyCode),
      plantCode = VALUES(plantCode),
      linkedAt = CURRENT_TIMESTAMP
    `,
    extinguisherId,
    plantId,
    companyCode,
    plantCode
  );
}

async function fetchExtinguisherRow(serial: string): Promise<Record<string, unknown> | null> {
  const hasPlants = await schemaHasPlantsTable();
  const join = extinguisherPlantJoin(hasPlants);
  const fields = extinguisherSelectFields(hasPlants);
  const inJoin = extinguisherInspectionJoin();
  const inSel = extinguisherInspectionSelect();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT ${fields}${inSel}
      FROM ${TABLE_SCHEMA}.${TABLE_NAME} e
      ${join}
      ${inJoin}
      WHERE e.id = ?
      LIMIT 1
    `,
    serial
  )) as Record<string, unknown>[];
  return rows[0] ?? null;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await ensureExtinguisherTable();
    const { id: rawParam } = await context.params;
    const serial = decodeURIComponent(rawParam || '').trim().toUpperCase();
    if (!serial) {
      return NextResponse.json({ message: 'Extinguisher id is required.' }, { status: 400 });
    }

    const existing = (await prisma.$queryRawUnsafe(
      `SELECT id, installedBy, installedDate FROM ${TABLE_SCHEMA}.${TABLE_NAME} WHERE id = ? LIMIT 1`,
      serial
    )) as Array<{ id: string; installedBy: string; installedDate: Date | string }>;

    if (existing.length === 0) {
      return NextResponse.json({ message: 'Extinguisher not found.' }, { status: 404 });
    }

    const body = (await request.json()) as UpdateBody;
    const plantLabel = (body.plant ?? body.plantOffice ?? '').trim();
    const plantOffice = (body.plantOffice ?? plantLabel).trim();
    if (!plantLabel || !body.make?.trim()) {
      return NextResponse.json({ message: 'Required fields are missing.' }, { status: 400 });
    }

    const hydraulicNorm =
      body.hydraulicDueDate != null && String(body.hydraulicDueDate).trim() !== ''
        ? String(body.hydraulicDueDate).trim().slice(0, 10)
        : null;

    const nextUtTestDateStored = hydraulicNorm
      ? addYearsToIsoDate(hydraulicNorm, 3)
      : String(body.nextUtTestDate ?? '').trim().slice(0, 10);

    const installedBy = existing[0].installedBy;
    const rawInst = existing[0].installedDate;
    const installedDate =
      rawInst instanceof Date && !Number.isNaN(rawInst.getTime())
        ? (() => {
            const d = rawInst;
            const p = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
          })()
        : String(rawInst ?? '')
            .replace('T', ' ')
            .slice(0, 19);

    const lastUtNorm = String(body.lastUtTestDate ?? '').trim().slice(0, 10);
    const mfgNorm = String(body.manufacturingDate ?? '').trim().slice(0, 10);
    const lastUtStored = lastUtNorm || mfgNorm;

    await prisma.$executeRawUnsafe(
      `
        UPDATE ${TABLE_SCHEMA}.${TABLE_NAME}
        SET
          division = ?,
          subDivision = ?,
          zone = ?,
          plantOffice = ?,
          plantId = ?,
          companyCode = ?,
          plantCode = ?,
          plant = ?,
          showStatus = ?,
          region = ?,
          plant_unit = ?,
          cluster = ?,
          company_name = ?,
          make = ?,
          type = ?,
          media = ?,
          capacity = ?,
          locationWithElevation = ?,
          lastUtTestDate = ?,
          manufacturingDate = ?,
          nextUtTestDate = ?,
          hydraulicDueDate = ?,
          installedBy = ?,
          installedDate = ?
        WHERE id = ?
      `,
      body.division ?? '',
      body.subDivision ?? '',
      body.zone ?? '',
      plantOffice,
      body.plantId ?? null,
      body.companyCode ?? '',
      body.plantCode ?? '',
      plantLabel,
      body.showStatus ?? 't',
      body.region ?? '',
      body.plant_unit ?? '',
      body.cluster ?? '',
      body.company_name ?? '',
      body.make?.trim() ?? '',
      body.type ?? '',
      body.media ?? '',
      body.capacity ?? '',
      body.locationWithElevation ?? '',
      lastUtStored,
      mfgNorm,
      nextUtTestDateStored,
      hydraulicNorm,
      installedBy,
      installedDate,
      serial
    );

    await upsertRelation(serial, body.plantId ?? null, body.companyCode ?? '', body.plantCode ?? '');

    const updated = await fetchExtinguisherRow(serial);
    return NextResponse.json(mapExtinguisherApiRow(updated), { status: 200 });
  } catch (error) {
    console.error('Failed to update extinguisher', error);
    return NextResponse.json(
      {
        message: 'Failed to update extinguisher record',
        detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
