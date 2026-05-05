import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type CreatePlantBody = {
  id?: number;
  division?: string;
  subDivision?: string;
  zone?: string;
  plantOffice?: string;
  companyCode?: string;
  plantCode?: string;
  plantSName?: string;
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
};

async function getPlantColumnMeta() {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT COLUMN_NAME, DATA_TYPE
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ?
    `,
    TABLE_SCHEMA,
    TABLE_NAME
  )) as ColumnMeta[];

  const dataTypeByColumn = new Map<string, string>();
  for (const row of rows) {
    dataTypeByColumn.set(row.COLUMN_NAME, row.DATA_TYPE.toLowerCase());
  }
  return dataTypeByColumn;
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

/**
 * Legacy `tbl_plants` often has very short `plantSName` / `plantName` (e.g. varchar(10)).
 * Editing with a longer label triggers MySQL 1406. Widen to VARCHAR(255) when needed.
 */
async function ensurePlantNameColumnsWideEnough() {
  type ColRow = {
    COLUMN_NAME: string;
    DATA_TYPE: string;
    CHARACTER_MAXIMUM_LENGTH: number | null;
    IS_NULLABLE: 'YES' | 'NO';
  };
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        AND COLUMN_NAME IN ('plantSName', 'plantName')
    `,
    TABLE_SCHEMA,
    TABLE_NAME
  )) as ColRow[];

  const targetLen = 255;
  for (const row of rows) {
    const dt = row.DATA_TYPE.toLowerCase();
    if (dt !== 'varchar' && dt !== 'char') continue;
    const maxLen = row.CHARACTER_MAXIMUM_LENGTH;
    if (maxLen != null && maxLen >= targetLen) continue;

    const col = row.COLUMN_NAME;
    const nullable = row.IS_NULLABLE === 'YES';
    const nullSql = nullable ? 'NULL' : 'NOT NULL';
    await prisma.$executeRawUnsafe(
      `ALTER TABLE ${TABLE_SCHEMA}.${TABLE_NAME} MODIFY COLUMN \`${col}\` VARCHAR(${targetLen}) ${nullSql}`
    );
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

function normalizeStatusByType(value: string, dataType: string | undefined) {
  const raw = value.trim().toLowerCase();
  const isActive =
    ['1', 'true', 't', 'active', 'yes', 'y', 'a'].includes(raw) ||
    (!raw || raw === 'enabled');
  const isInactive = ['0', 'false', 'f', 'inactive', 'no', 'n', 'i', 'disabled'].includes(raw);

  if (!dataType) {
    if (isInactive) return 'f';
    if (isActive) return 't';
    return value;
  }

  const numericTypes = new Set(['tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'double', 'float']);
  if (numericTypes.has(dataType)) {
    if (isActive) return 1;
    if (isInactive) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 1;
  }

  // For char(1), enum('t','f'), varchar status columns, send compact flags.
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
    plantSName: String(row.plantSName ?? ''),
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
    await ensurePlantNameColumnsWideEnough();
    const meta = await getPlantColumnMeta();
    const hasPlantName = meta.has('plantName');
    const hasPlantSName = meta.has('plantSName');
    const nameSelect = hasPlantSName
      ? 'plantSName'
      : hasPlantName
      ? 'plantName AS plantSName'
      : "'' AS plantSName";

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, division, subDivision, zone, plantOffice, companyCode, plantCode, ${nameSelect}, showStatus, region, plant_unit, cluster, company_name FROM ${TABLE_SCHEMA}.${TABLE_NAME} ORDER BY id ASC`
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
    await ensurePlantNameColumnsWideEnough();
    const body = (await request.json()) as CreatePlantBody;
    const division = body.division?.trim() || '';
    const subDivision = body.subDivision?.trim() || '';
    const zone = body.zone?.trim() || '';
    const plantOffice = body.plantOffice?.trim() || '';
    const companyCode = body.companyCode?.trim();
    const plantCode = body.plantCode?.trim();
    const plantSName = body.plantSName?.trim();
    const showStatus = body.showStatus?.trim() || 'Active';
    const region = body.region?.trim() || '';
    const plant_unit = body.plant_unit?.trim() || '';
    const cluster = body.cluster?.trim() || '';
    const company_name = body.company_name?.trim() || '';

    if (!companyCode || !plantCode || !plantSName) {
      return NextResponse.json(
        { message: 'companyCode, plantCode, and plantSName are required.' },
        { status: 400 }
      );
    }

    const meta = await getPlantColumnMeta();
    const normalizedCompanyCode = normalizeByColumnType(companyCode, meta.get('companyCode'));
    const normalizedPlantCode = normalizeByColumnType(plantCode, meta.get('plantCode'));
    const normalizedShowStatus = normalizeStatusByType(showStatus, meta.get('showStatus'));
    const hasPlantName = meta.has('plantName');
    const hasPlantSName = meta.has('plantSName');

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

    if (hasPlantSName) {
      insertColumns.push('plantSName');
      insertValues.push(plantSName);
    }
    if (hasPlantName) {
      insertColumns.push('plantName');
      insertValues.push(plantSName);
    }

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

    const nameSelect = hasPlantSName
      ? 'plantSName'
      : hasPlantName
      ? 'plantName AS plantSName'
      : "'' AS plantSName";
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, division, subDivision, zone, plantOffice, companyCode, plantCode, ${nameSelect}, showStatus, region, plant_unit, cluster, company_name FROM ${TABLE_SCHEMA}.${TABLE_NAME} ORDER BY id DESC LIMIT 1`
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
    await ensurePlantNameColumnsWideEnough();
    const body = (await request.json()) as CreatePlantBody;
    const id = Number(body.id ?? 0);
    const division = body.division?.trim() || '';
    const subDivision = body.subDivision?.trim() || '';
    const zone = body.zone?.trim() || '';
    const plantOffice = body.plantOffice?.trim() || '';
    const companyCode = body.companyCode?.trim();
    const plantCode = body.plantCode?.trim();
    const plantSName = body.plantSName?.trim();
    const showStatus = body.showStatus?.trim() || 'Active';
    const region = body.region?.trim() || '';
    const plant_unit = body.plant_unit?.trim() || '';
    const cluster = body.cluster?.trim() || '';
    const company_name = body.company_name?.trim() || '';

    if (!id || !companyCode || !plantCode || !plantSName) {
      return NextResponse.json(
        { message: 'id, companyCode, plantCode, and plantSName are required.' },
        { status: 400 }
      );
    }

    const meta = await getPlantColumnMeta();
    const normalizedCompanyCode = normalizeByColumnType(companyCode, meta.get('companyCode'));
    const normalizedPlantCode = normalizeByColumnType(plantCode, meta.get('plantCode'));
    const normalizedShowStatus = normalizeStatusByType(showStatus, meta.get('showStatus'));
    const hasPlantName = meta.has('plantName');
    const hasPlantSName = meta.has('plantSName');

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
    if (hasPlantSName) addSet('plantSName', plantSName);
    if (hasPlantName) addSet('plantName', plantSName);
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

    const nameSelect = hasPlantSName
      ? 'plantSName'
      : hasPlantName
      ? 'plantName AS plantSName'
      : "'' AS plantSName";
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, division, subDivision, zone, plantOffice, companyCode, plantCode, ${nameSelect}, showStatus, region, plant_unit, cluster, company_name FROM ${TABLE_SCHEMA}.${TABLE_NAME} WHERE id = ? LIMIT 1`,
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
