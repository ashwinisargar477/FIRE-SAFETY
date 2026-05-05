import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ensureExtinguisherTable,
  EXTINGUISHER_REL_TABLE_NAME,
  EXTINGUISHER_TABLE_NAME,
  EXTINGUISHER_TABLE_SCHEMA,
} from '@/lib/extinguisherTable';

const TABLE_SCHEMA = EXTINGUISHER_TABLE_SCHEMA;
const TABLE_NAME = EXTINGUISHER_TABLE_NAME;
const REL_TABLE_NAME = EXTINGUISHER_REL_TABLE_NAME;

type CreateExtinguisherBody = {
  id?: string;
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
  installedBy?: string;
  installedDate?: string;
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

export async function GET(request: NextRequest) {
  try {
    await ensureExtinguisherTable();
    const includeArchived = request.nextUrl.searchParams.get('includeArchived') === '1';
    const archivedClause = includeArchived ? '1=1' : 'e.archived_at IS NULL';
    const hasPlants = await schemaHasPlantsTable();
    const join = extinguisherPlantJoin(hasPlants);
    const fields = extinguisherSelectFields(hasPlants);
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT ${fields}
        FROM ${TABLE_SCHEMA}.${TABLE_NAME} e
        ${join}
        WHERE ${archivedClause}
        ORDER BY e.installedDate DESC
      `
    )) as Record<string, unknown>[];
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch extinguishers', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch extinguisher records',
        detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureExtinguisherTable();
    const body = (await request.json()) as CreateExtinguisherBody;
    const serial = body.id?.trim().toUpperCase();
    const plantLabel = (body.plant ?? body.plantOffice ?? '').trim();
    const plantOffice = (body.plantOffice ?? plantLabel).trim();
    if (!serial || !plantLabel || !body.make) {
      return NextResponse.json({ message: 'Required fields are missing.' }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO ${TABLE_SCHEMA}.${TABLE_NAME}
        (id, division, subDivision, zone, plantOffice, plantId, companyCode, plantCode, plant, showStatus, region, plant_unit, cluster, company_name, make, type, media, capacity, locationWithElevation, lastUtTestDate, manufacturingDate, nextUtTestDate, hydraulicDueDate, installedBy, installedDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        division = VALUES(division),
        subDivision = VALUES(subDivision),
        zone = VALUES(zone),
        plantOffice = VALUES(plantOffice),
        plantId = VALUES(plantId),
        companyCode = VALUES(companyCode),
        plantCode = VALUES(plantCode),
        plant = VALUES(plant),
        showStatus = VALUES(showStatus),
        region = VALUES(region),
        plant_unit = VALUES(plant_unit),
        cluster = VALUES(cluster),
        company_name = VALUES(company_name),
        make = VALUES(make),
        type = VALUES(type),
        media = VALUES(media),
        capacity = VALUES(capacity),
        locationWithElevation = VALUES(locationWithElevation),
        lastUtTestDate = VALUES(lastUtTestDate),
        manufacturingDate = VALUES(manufacturingDate),
        nextUtTestDate = VALUES(nextUtTestDate),
        hydraulicDueDate = VALUES(hydraulicDueDate),
        installedBy = VALUES(installedBy),
        installedDate = VALUES(installedDate),
        archived_at = NULL,
        archived_reason = NULL
      `,
      serial,
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
      body.make,
      body.type ?? '',
      body.media ?? '',
      body.capacity ?? '',
      body.locationWithElevation ?? '',
      body.lastUtTestDate ?? '',
      body.manufacturingDate ?? '',
      body.nextUtTestDate ?? '',
      body.hydraulicDueDate ?? null,
      body.installedBy ?? 'nuvoco\\admin',
      body.installedDate ?? new Date().toISOString().slice(0, 19).replace('T', ' ')
    );
    await upsertRelation(
      serial,
      body.plantId ?? null,
      body.companyCode ?? '',
      body.plantCode ?? ''
    );

    const hasPlants = await schemaHasPlantsTable();
    const join = extinguisherPlantJoin(hasPlants);
    const fields = extinguisherSelectFields(hasPlants);
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT ${fields}
        FROM ${TABLE_SCHEMA}.${TABLE_NAME} e
        ${join}
        WHERE e.id = ?
        LIMIT 1
      `,
      serial
    )) as Record<string, unknown>[];

    return NextResponse.json(rows[0] ?? null, { status: 201 });
  } catch (error) {
    console.error('Failed to save extinguisher', error);
    return NextResponse.json({ message: 'Failed to save extinguisher record' }, { status: 500 });
  }
}

export async function PUT() {
  try {
    await ensureExtinguisherTable();
    const plants = (await prisma.$queryRawUnsafe(
      `SELECT id, companyCode, plantCode, plantSName, showStatus, region, plant_unit, cluster, company_name FROM ${TABLE_SCHEMA}.tbl_plants ORDER BY id ASC LIMIT 5`
    )) as Array<Record<string, unknown>>;

    if (plants.length === 0) {
      return NextResponse.json({ message: 'No plants found to seed extinguisher records.' }, { status: 400 });
    }

    const seededIds: string[] = [];
    for (let i = 0; i < plants.length; i += 1) {
      const plantId = Number(plants[i].id);
      const companyCode = String(plants[i].companyCode ?? '');
      const plantCode = String(plants[i].plantCode ?? '');
      const plantName = String(plants[i].plantSName ?? '');
      const showStatus = String(plants[i].showStatus ?? 't');
      const region = String(plants[i].region ?? '');
      const plantUnit = String(plants[i].plant_unit ?? '');
      const cluster = String(plants[i].cluster ?? '');
      const companyName = String(plants[i].company_name ?? '');
      const serial = `${plantCode}-FE-${String(i + 1).padStart(2, '0')}`;
      seededIds.push(serial);
      const hydraulicDueForSeed = i === 0 ? new Date().toISOString().slice(0, 10) : null;

      await prisma.$executeRawUnsafe(
        `
          INSERT INTO ${TABLE_SCHEMA}.${TABLE_NAME}
          (id, division, subDivision, zone, plantOffice, plantId, companyCode, plantCode, plant, showStatus, region, plant_unit, cluster, company_name, make, type, media, capacity, locationWithElevation, lastUtTestDate, manufacturingDate, nextUtTestDate, hydraulicDueDate, installedBy, installedDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          division = VALUES(division),
          subDivision = VALUES(subDivision),
          zone = VALUES(zone),
          plantOffice = VALUES(plantOffice),
          plantId = VALUES(plantId),
          companyCode = VALUES(companyCode),
          plantCode = VALUES(plantCode),
          plant = VALUES(plant),
          showStatus = VALUES(showStatus),
          region = VALUES(region),
          plant_unit = VALUES(plant_unit),
          cluster = VALUES(cluster),
          company_name = VALUES(company_name),
          make = VALUES(make),
          type = VALUES(type),
          media = VALUES(media),
          capacity = VALUES(capacity),
          locationWithElevation = VALUES(locationWithElevation),
          lastUtTestDate = VALUES(lastUtTestDate),
          manufacturingDate = VALUES(manufacturingDate),
          nextUtTestDate = VALUES(nextUtTestDate),
          hydraulicDueDate = VALUES(hydraulicDueDate),
          installedBy = VALUES(installedBy),
          installedDate = VALUES(installedDate),
          archived_at = NULL,
          archived_reason = NULL
        `,
        serial,
        'Manufacturing',
        'Cement',
        region.includes('North') ? 'North Zone Cement' : 'West Zone Cement',
        plantName,
        plantId,
        companyCode,
        plantCode,
        plantName,
        showStatus,
        region,
        plantUnit,
        cluster,
        companyName,
        'Kanex',
        i % 2 === 0 ? 'ABC' : 'CO2',
        i % 2 === 0 ? 'DCP' : 'Co2',
        i % 2 === 0 ? '6' : '4.5',
        `${plantName} - Zone ${i + 1}`,
        '2026-04-01',
        '2026-02-01',
        '2029-03-31',
        hydraulicDueForSeed,
        'nuvoco\\ashwini.sargar',
        new Date().toISOString().slice(0, 19).replace('T', ' ')
      );

      await upsertRelation(serial, plantId, companyCode, plantCode);
    }

    return NextResponse.json(
      {
        message: 'Seeded 5 extinguisher records with plant relation mapping.',
        table: `${TABLE_SCHEMA}.${TABLE_NAME}`,
        relationTable: `${TABLE_SCHEMA}.${REL_TABLE_NAME}`,
        seededIds,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to seed extinguisher records', error);
    return NextResponse.json({ message: 'Failed to seed extinguisher records.' }, { status: 500 });
  }
}
