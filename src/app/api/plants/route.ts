import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { seedCementMasterPlantsIfMissing } from '@/lib/cementPlantSeed';

type CreatePlantBody = {
  id?: number;
  division?: string;
  subDivision?: string;
  zone?: string;
  plantOffice?: string;
  companyCode?: string;
  plantCode?: string;
  showStatus?: string;
  region?: string;
  plant_unit?: string;
  cluster?: string;
  company_name?: string;
};

const TABLE_SCHEMA = 'transporter';
const TABLE_NAME = 'tbl_plants';

type ColumnMeta = {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
};

type PlantColumnInfo = { dataType: string; columnType: string };

/** Parse labels from MySQL/MariaDB `enum('A','B')` (COLUMN_TYPE). */
function parseMysqlEnumLabels(columnType: string): string[] {
  const trimmed = columnType.trim();
  if (!/^enum\s*\(/i.test(trimmed)) return [];
  const inner = trimmed.replace(/^enum\s*\(/i, '').replace(/\)\s*$/i, '');
  const labels: string[] = [];
  let buf = '';
  let inQuote = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "'" && inner[i - 1] !== '\\') {
      if (!inQuote) {
        inQuote = true;
      } else {
        inQuote = false;
        labels.push(buf.replace(/''/g, "'"));
        buf = '';
      }
      continue;
    }
    if (inQuote) buf += ch;
  }
  return labels;
}

async function getPlantColumnMeta() {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ?
    `,
    TABLE_SCHEMA,
    TABLE_NAME
  )) as ColumnMeta[];

  const byColumn = new Map<string, PlantColumnInfo>();
  for (const row of rows) {
    byColumn.set(row.COLUMN_NAME, {
      dataType: row.DATA_TYPE.toLowerCase(),
      columnType: row.COLUMN_TYPE,
    });
  }
  return byColumn;
}

async function ensurePlantHierarchyColumns() {
  const ensureColumn = async (columnName: string, columnSql: string) => {
    const existing = (await prisma.$queryRawUnsafe(
      `
        SELECT COLUMN_NAME
        FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ? AND column_name = ?
      `,
      TABLE_SCHEMA,
      TABLE_NAME,
      columnName
    )) as Array<Record<string, unknown>>;

    if (existing.length === 0) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE ${TABLE_SCHEMA}.${TABLE_NAME} ADD COLUMN ${columnSql}`
      );
    }
  };

  await ensureColumn('division', "division VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumn('subDivision', "subDivision VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumn('zone', "zone VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumn('plantOffice', "plantOffice VARCHAR(255) NOT NULL DEFAULT ''");
}

/** Removes legacy short-name columns; plant label is `plantOffice`. */
async function dropLegacyPlantNameColumns() {
  for (const columnName of ['plantSName', 'plantName'] as const) {
    const existing = (await prisma.$queryRawUnsafe(
      `
        SELECT COLUMN_NAME
        FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ? AND column_name = ?
      `,
      TABLE_SCHEMA,
      TABLE_NAME,
      columnName
    )) as Array<Record<string, unknown>>;

    if (existing.length > 0) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE ${TABLE_SCHEMA}.${TABLE_NAME} DROP COLUMN \`${columnName}\``
      );
    }
  }
}

function normalizeByColumnType(value: string, dataType: string | undefined) {
  if (!dataType) return value;
  const numericTypes = new Set(['tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'double', 'float']);
  if (!numericTypes.has(dataType)) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeStatusByType(
  value: string,
  info: PlantColumnInfo | undefined
): string | number {
  const raw = value.trim().toLowerCase();
  const isActive =
    ['1', 'true', 't', 'active', 'yes', 'y', 'a'].includes(raw) || !raw || raw === 'enabled';
  const isInactive = ['0', 'false', 'f', 'inactive', 'no', 'n', 'i', 'disabled'].includes(raw);

  const dataType = info?.dataType;
  const columnType = info?.columnType ?? '';

  const numericTypes = new Set(['tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'double', 'float']);
  if (dataType && numericTypes.has(dataType)) {
    if (isInactive) return 0;
    if (isActive) return 1;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 1;
  }

  // Legacy table: ENUM('Active','Inactive',...) — must send a real enum label, not 't'/'f'.
  if (dataType === 'enum') {
    const labels = parseMysqlEnumLabels(columnType);
    if (labels.length > 0) {
      const exact = labels.find((l) => l.toLowerCase() === value.trim().toLowerCase());
      if (exact) return exact;

      const pickMatch = (re: RegExp) => labels.find((l) => re.test(l.toLowerCase()));
      if (isInactive) {
        return (
          pickMatch(/inactive|disable|no|off|0/) ??
          labels.find((l) => l === 'f' || l === 'N') ??
          labels[labels.length - 1] ??
          labels[0]
        );
      }
      if (isActive) {
        return (
          pickMatch(/active|enable|yes|on|1/) ??
          labels.find((l) => l === 't' || l === 'Y') ??
          labels[0]
        );
      }
      return labels[0];
    }
    if (isInactive) return 'Inactive';
    if (isActive) return 'Active';
    return value;
  }

  if (!dataType) {
    if (isInactive) return 'f';
    if (isActive) return 't';
    return value;
  }

  // char(1), varchar, etc.: compact flags when they fit typical legacy schemas.
  if (isActive) return 't';
  if (isInactive) return 'f';

  return value;
}

function mapPlantRow(row: Record<string, unknown>) {
  return {
    id: Number(row.id ?? 0),
    division: String(row.division ?? ''),
    subDivision: String(row.subDivision ?? ''),
    zone: String(row.zone ?? ''),
    plantOffice: String(row.plantOffice ?? ''),
    companyCode: String(row.companyCode ?? ''),
    plantCode: String(row.plantCode ?? ''),
    showStatus: String(row.showStatus ?? ''),
    region: String(row.region ?? ''),
    plant_unit: String(row.plant_unit ?? ''),
    cluster: String(row.cluster ?? ''),
    company_name: String(row.company_name ?? ''),
  };
}

export async function GET() {
  try {
    await ensurePlantHierarchyColumns();
    await dropLegacyPlantNameColumns();
    try {
      await seedCementMasterPlantsIfMissing();
    } catch (seedErr) {
      console.error('Cement plant seed skipped', seedErr);
    }
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, division, subDivision, zone, plantOffice, companyCode, plantCode, showStatus, region, plant_unit, cluster, company_name FROM ${TABLE_SCHEMA}.${TABLE_NAME} ORDER BY id ASC`
    )) as Record<string, unknown>[];
    const plants = rows.map((row) => mapPlantRow(row));
    return NextResponse.json(plants, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch plants', error);
    return NextResponse.json(
      { message: `Failed to fetch plants from ${TABLE_SCHEMA}.${TABLE_NAME}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensurePlantHierarchyColumns();
    await dropLegacyPlantNameColumns();
    const body = (await request.json()) as CreatePlantBody;
    const division = body.division?.trim() || '';
    const subDivision = body.subDivision?.trim() || '';
    const zone = body.zone?.trim() || '';
    const plantOffice = body.plantOffice?.trim() || '';
    const companyCode = body.companyCode?.trim();
    const plantCode = body.plantCode?.trim();
    const showStatus = body.showStatus?.trim() || 'Active';
    const region = body.region?.trim() || '';
    const plant_unit = body.plant_unit?.trim() || '';
    const cluster = body.cluster?.trim() || '';
    const company_name = body.company_name?.trim() || '';

    if (!companyCode || !plantCode) {
      return NextResponse.json(
        { message: 'companyCode and plantCode are required.' },
        { status: 400 }
      );
    }

    const meta = await getPlantColumnMeta();
    const normalizedCompanyCode = normalizeByColumnType(companyCode, meta.get('companyCode')?.dataType);
    const normalizedPlantCode = normalizeByColumnType(plantCode, meta.get('plantCode')?.dataType);
    const normalizedShowStatus = normalizeStatusByType(showStatus, meta.get('showStatus'));

    if (normalizedCompanyCode === null) {
      return NextResponse.json(
        { message: 'Company Code must be numeric as per current database schema.' },
        { status: 400 }
      );
    }
    if (normalizedPlantCode === null) {
      return NextResponse.json(
        { message: 'Plant Code must be numeric as per current database schema.' },
        { status: 400 }
      );
    }

    const insertColumns = ['division', 'subDivision', 'zone', 'plantOffice', 'companyCode', 'plantCode'];
    const insertValues: Array<string | number> = [
      division,
      subDivision,
      zone,
      plantOffice,
      normalizedCompanyCode as string | number,
      normalizedPlantCode as string | number,
    ];

    insertColumns.push('showStatus', 'region', 'plant_unit', 'cluster', 'company_name');
    insertValues.push(normalizedShowStatus as string | number, region, plant_unit, cluster, company_name);

    const placeholders = insertColumns.map(() => '?').join(', ');

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO ${TABLE_SCHEMA}.${TABLE_NAME}
        (${insertColumns.join(', ')})
        VALUES (${placeholders})
      `,
      ...insertValues
    );

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, division, subDivision, zone, plantOffice, companyCode, plantCode, showStatus, region, plant_unit, cluster, company_name FROM ${TABLE_SCHEMA}.${TABLE_NAME} ORDER BY id DESC LIMIT 1`
    )) as Record<string, unknown>[];
    const plant = mapPlantRow(rows[0] ?? {});

    return NextResponse.json(plant, { status: 201 });
  } catch (error) {
    console.error('Failed to create plant', error);
    return NextResponse.json(
      {
        message: `Failed to create plant in ${TABLE_SCHEMA}.${TABLE_NAME}`,
        detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await ensurePlantHierarchyColumns();
    await dropLegacyPlantNameColumns();
    const body = (await request.json()) as CreatePlantBody;
    const id = Number(body.id ?? 0);
    const division = body.division?.trim() || '';
    const subDivision = body.subDivision?.trim() || '';
    const zone = body.zone?.trim() || '';
    const plantOffice = body.plantOffice?.trim() || '';
    const companyCode = body.companyCode?.trim();
    const plantCode = body.plantCode?.trim();
    const showStatus = body.showStatus?.trim() || 'Active';
    const region = body.region?.trim() || '';
    const plant_unit = body.plant_unit?.trim() || '';
    const cluster = body.cluster?.trim() || '';
    const company_name = body.company_name?.trim() || '';

    if (!id || !companyCode || !plantCode) {
      return NextResponse.json(
        { message: 'id, companyCode, and plantCode are required.' },
        { status: 400 }
      );
    }

    const meta = await getPlantColumnMeta();
    const normalizedCompanyCode = normalizeByColumnType(companyCode, meta.get('companyCode')?.dataType);
    const normalizedPlantCode = normalizeByColumnType(plantCode, meta.get('plantCode')?.dataType);
    const normalizedShowStatus = normalizeStatusByType(showStatus, meta.get('showStatus'));

    if (normalizedCompanyCode === null) {
      return NextResponse.json(
        { message: 'Company Code must be numeric as per current database schema.' },
        { status: 400 }
      );
    }
    if (normalizedPlantCode === null) {
      return NextResponse.json(
        { message: 'Plant Code must be numeric as per current database schema.' },
        { status: 400 }
      );
    }

    const setClauses: string[] = [];
    const values: Array<string | number> = [];
    const addSet = (column: string, value: string | number) => {
      setClauses.push(`${column} = ?`);
      values.push(value);
    };

    addSet('division', division);
    addSet('subDivision', subDivision);
    addSet('zone', zone);
    addSet('plantOffice', plantOffice);
    addSet('companyCode', normalizedCompanyCode as string | number);
    addSet('plantCode', normalizedPlantCode as string | number);
    addSet('showStatus', normalizedShowStatus as string | number);
    addSet('region', region);
    addSet('plant_unit', plant_unit);
    addSet('cluster', cluster);
    addSet('company_name', company_name);

    await prisma.$executeRawUnsafe(
      `
        UPDATE ${TABLE_SCHEMA}.${TABLE_NAME}
        SET ${setClauses.join(', ')}
        WHERE id = ?
      `,
      ...values,
      id
    );

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, division, subDivision, zone, plantOffice, companyCode, plantCode, showStatus, region, plant_unit, cluster, company_name FROM ${TABLE_SCHEMA}.${TABLE_NAME} WHERE id = ? LIMIT 1`,
      id
    )) as Record<string, unknown>[];

    return NextResponse.json(mapPlantRow(rows[0] ?? {}), { status: 200 });
  } catch (error) {
    console.error('Failed to update plant', error);
    return NextResponse.json(
      {
        message: `Failed to update plant in ${TABLE_SCHEMA}.${TABLE_NAME}`,
        detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { id?: number };
    const id = Number(body.id ?? 0);
    if (!id) {
      return NextResponse.json({ message: 'id is required for delete.' }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM ${TABLE_SCHEMA}.${TABLE_NAME} WHERE id = ?`,
      id
    );

    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete plant', error);
    return NextResponse.json(
      {
        message: `Failed to delete plant from ${TABLE_SCHEMA}.${TABLE_NAME}`,
        detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
