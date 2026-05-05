import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ensureUsersTable,
  mapUserRow,
  USERS_TABLE_NAME,
  USERS_TABLE_SCHEMA,
} from '@/lib/usersTable';

type CreateUserBody = {
  id?: number;
  empId?: string;
  username?: string;
  email?: string;
  role?: string;
  assignedPlantCode?: string;
  isLdapActive?: boolean;
};

export async function GET() {
  try {
    await ensureUsersTable();
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, empId, username, email, role, assignedPlantCode, isLdapActive
        FROM ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME}
        ORDER BY id ASC
      `
    )) as Array<Record<string, unknown>>;
    return NextResponse.json(rows.map(mapUserRow), { status: 200 });
  } catch (error) {
    console.error('Failed to fetch users', error);
    return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureUsersTable();
    const body = (await request.json()) as CreateUserBody;
    const empId = body.empId?.trim();
    const username = body.username?.trim();
    const email = body.email?.trim();
    const role = body.role?.trim() || 'User';
    const assignedPlantCode = body.assignedPlantCode?.trim().toUpperCase() || '';
    const isLdapActive = body.isLdapActive ?? true;

    if (!empId || !username || !email) {
      return NextResponse.json(
        { message: 'empId, username and email are required.' },
        { status: 400 }
      );
    }

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME}
        (empId, username, email, role, assignedPlantCode, isLdapActive)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      empId,
      username,
      email,
      role,
      assignedPlantCode,
      isLdapActive ? 1 : 0
    );

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, empId, username, email, role, assignedPlantCode, isLdapActive
        FROM ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME}
        WHERE empId = ?
        LIMIT 1
      `,
      empId
    )) as Array<Record<string, unknown>>;

    return NextResponse.json(mapUserRow(rows[0] ?? {}), { status: 201 });
  } catch (error) {
    console.error('Failed to create user', error);
    return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await ensureUsersTable();
    const body = (await request.json()) as CreateUserBody;
    const id = Number(body.id ?? 0);
    const empId = body.empId?.trim();
    const username = body.username?.trim();
    const email = body.email?.trim();
    const role = body.role?.trim() || 'User';
    const assignedPlantCode = body.assignedPlantCode?.trim().toUpperCase() || '';
    const isLdapActive = body.isLdapActive ?? true;

    if (!id || !empId || !username || !email) {
      return NextResponse.json(
        { message: 'id, empId, username and email are required.' },
        { status: 400 }
      );
    }

    await prisma.$executeRawUnsafe(
      `
        UPDATE ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME}
        SET empId = ?, username = ?, email = ?, role = ?, assignedPlantCode = ?, isLdapActive = ?
        WHERE id = ?
      `,
      empId,
      username,
      email,
      role,
      assignedPlantCode,
      isLdapActive ? 1 : 0,
      id
    );

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT id, empId, username, email, role, assignedPlantCode, isLdapActive
        FROM ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME}
        WHERE id = ?
        LIMIT 1
      `,
      id
    )) as Array<Record<string, unknown>>;

    return NextResponse.json(mapUserRow(rows[0] ?? {}), { status: 200 });
  } catch (error) {
    console.error('Failed to update user', error);
    return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureUsersTable();
    const body = (await request.json()) as { id?: number };
    const id = Number(body.id ?? 0);
    if (!id) {
      return NextResponse.json({ message: 'id is required.' }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME} WHERE id = ?`,
      id
    );
    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete user', error);
    return NextResponse.json({ message: 'Failed to delete user' }, { status: 500 });
  }
}
