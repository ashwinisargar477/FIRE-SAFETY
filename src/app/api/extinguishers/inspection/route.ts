import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

import { prisma } from '@/lib/prisma';
import { getJwtSecretBytes } from '@/lib/jwtSecret';
import {
  ensureExtinguisherTable,
  EXTINGUISHER_INSPECTION_TABLE_NAME,
  EXTINGUISHER_TABLE_NAME,
  EXTINGUISHER_TABLE_SCHEMA,
} from '@/lib/extinguisherTable';

const SCHEMA = EXTINGUISHER_TABLE_SCHEMA;
const EXT_TABLE = EXTINGUISHER_TABLE_NAME;
const INSP_TABLE = EXTINGUISHER_INSPECTION_TABLE_NAME;

function mapInspectionRow(row: Record<string, unknown>) {
  return {
    inspectionId: Number(row.inspectionId),
    extinguisherId: String(row.extinguisherId ?? ''),
    status: String(row.status ?? ''),
    remark: row.remark == null || row.remark === '' ? null : String(row.remark),
    inspectedBy: String(row.inspectedBy ?? ''),
    inspectedAt: String(row.inspectedAt ?? ''),
  };
}

type JwtPayload = {
  empCode?: string;
  empName?: string;
};

async function resolveInspectedBy(request: NextRequest, bodyFallback?: string): Promise<string | null> {
  try {
    const jar = await cookies();
    const token = jar.get('jwt')?.value;
    if (token) {
      const { payload } = await jwtVerify(token, getJwtSecretBytes());
      const p = payload as JwtPayload;
      const code = String(p.empCode ?? '').trim();
      const name = String(p.empName ?? '').trim();
      if (name && code) return `${name} (${code})`;
      if (name) return name;
      if (code) return code;
    }
  } catch {
    /* use body */
  }
  const raw = typeof bodyFallback === 'string' ? bodyFallback.trim() : '';
  return raw || null;
}

export async function GET(request: NextRequest) {
  try {
    await ensureExtinguisherTable();
    const extinguisherId = request.nextUrl.searchParams.get('extinguisherId')?.trim().toUpperCase();
    if (!extinguisherId) {
      return NextResponse.json({ message: 'extinguisherId is required.' }, { status: 400 });
    }
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          inspectionId,
          extinguisherId,
          status,
          remark,
          inspectedBy,
          DATE_FORMAT(inspectedAt, '%Y-%m-%dT%H:%i:%sZ') AS inspectedAt
        FROM ${SCHEMA}.${INSP_TABLE}
        WHERE extinguisherId = ?
        ORDER BY inspectedAt DESC, inspectionId DESC
        LIMIT 50
      `,
      extinguisherId
    )) as Record<string, unknown>[];
    return NextResponse.json(rows.map(mapInspectionRow), { status: 200 });
  } catch (error) {
    console.error('Failed to fetch inspections', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch inspections',
        detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

type PostBody = {
  extinguisherId?: string;
  status?: string;
  remark?: string | null;
  inspectedBy?: string;
};

export async function POST(request: NextRequest) {
  try {
    await ensureExtinguisherTable();
    const body = (await request.json()) as PostBody;
    const extinguisherId = body.extinguisherId?.trim().toUpperCase();
    const statusRaw = String(body.status ?? '').trim().toUpperCase().replace(/\s+/g, '_');
    const status =
      statusRaw === 'NOT_OK' || statusRaw === 'PROBLEM' || statusRaw === 'NOK'
        ? 'NOT_OK'
        : statusRaw === 'OK'
          ? 'OK'
          : '';
    const remark = body.remark != null ? String(body.remark).trim() : '';

    if (!extinguisherId) {
      return NextResponse.json({ message: 'extinguisherId is required.' }, { status: 400 });
    }
    if (status !== 'OK' && status !== 'NOT_OK') {
      return NextResponse.json({ message: 'status must be OK or NOT_OK.' }, { status: 400 });
    }
    if (status === 'NOT_OK' && !remark) {
      return NextResponse.json({ message: 'Remark is required when status is not OK.' }, { status: 400 });
    }

    const exists = (await prisma.$queryRawUnsafe(
      `SELECT id FROM ${SCHEMA}.${EXT_TABLE} WHERE id = ? LIMIT 1`,
      extinguisherId
    )) as Array<{ id: string }>;
    if (exists.length === 0) {
      return NextResponse.json({ message: 'Extinguisher not found.' }, { status: 404 });
    }

    const inspectedBy = await resolveInspectedBy(request, body.inspectedBy);
    if (!inspectedBy) {
      return NextResponse.json(
        { message: 'Could not determine inspector. Sign in or provide inspectedBy.' },
        { status: 400 }
      );
    }

    const remarkStored = status === 'NOT_OK' ? remark : null;

    const saved = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `
          INSERT INTO ${SCHEMA}.${INSP_TABLE}
          (extinguisherId, status, remark, inspectedBy)
          VALUES (?, ?, ?, ?)
        `,
        extinguisherId,
        status,
        remarkStored,
        inspectedBy
      );
      const rows = (await tx.$queryRawUnsafe(
        `
          SELECT
            inspectionId,
            extinguisherId,
            status,
            remark,
            inspectedBy,
            DATE_FORMAT(inspectedAt, '%Y-%m-%dT%H:%i:%sZ') AS inspectedAt
          FROM ${SCHEMA}.${INSP_TABLE}
          WHERE inspectionId = LAST_INSERT_ID()
          LIMIT 1
        `
      )) as Record<string, unknown>[];
      return rows[0] ?? null;
    });

    return NextResponse.json(saved ? mapInspectionRow(saved as Record<string, unknown>) : null, { status: 201 });
  } catch (error) {
    console.error('Failed to save inspection', error);
    return NextResponse.json(
      {
        message: 'Failed to save inspection',
        detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
