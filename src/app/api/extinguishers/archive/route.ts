import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ensureExtinguisherTable,
  EXTINGUISHER_REL_TABLE_NAME,
  EXTINGUISHER_TABLE_NAME,
  EXTINGUISHER_TABLE_SCHEMA,
} from '@/lib/extinguisherTable';

type ArchiveBody = {
  id?: string;
  action?: 'archive' | 'restore' | 'delete';
  reason?: string;
};

export async function POST(request: Request) {
  try {
    await ensureExtinguisherTable();
    const body = (await request.json()) as ArchiveBody;
    const id = body.id?.trim().toUpperCase();
    const action = body.action ?? 'archive';
    if (!id) {
      return NextResponse.json({ message: 'Missing extinguisher id.' }, { status: 400 });
    }

    if (action === 'delete') {
      await prisma.$executeRawUnsafe(
        `DELETE FROM ${EXTINGUISHER_TABLE_SCHEMA}.${EXTINGUISHER_REL_TABLE_NAME} WHERE extinguisherId = ?`,
        id
      );
      await prisma.$executeRawUnsafe(
        `DELETE FROM ${EXTINGUISHER_TABLE_SCHEMA}.${EXTINGUISHER_TABLE_NAME} WHERE id = ?`,
        id
      );
      return NextResponse.json({ ok: true, id, action: 'delete' }, { status: 200 });
    }

    if (action === 'restore') {
      await prisma.$executeRawUnsafe(
        `
          UPDATE ${EXTINGUISHER_TABLE_SCHEMA}.${EXTINGUISHER_TABLE_NAME}
          SET archived_at = NULL, archived_reason = NULL
          WHERE id = ?
        `,
        id
      );
      return NextResponse.json({ ok: true, id, action: 'restore' }, { status: 200 });
    }

    const reason = (body.reason ?? 'Archived — past next UT / due date').slice(0, 250);
    await prisma.$executeRawUnsafe(
      `
        UPDATE ${EXTINGUISHER_TABLE_SCHEMA}.${EXTINGUISHER_TABLE_NAME}
        SET archived_at = CURRENT_TIMESTAMP, archived_reason = ?
        WHERE id = ?
      `,
      reason,
      id
    );
    return NextResponse.json({ ok: true, id, action: 'archive' }, { status: 200 });
  } catch (error) {
    console.error('Failed to archive extinguisher', error);
    return NextResponse.json({ message: 'Failed to update extinguisher record' }, { status: 500 });
  }
}
