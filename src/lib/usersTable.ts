import { prisma } from '@/lib/prisma';

export const USERS_TABLE_SCHEMA = 'transporter';
export const USERS_TABLE_NAME = 'tbl_users';

export type AppUser = {
  id: number;
  empId: string;
  username: string;
  email: string;
  role: string;
  assignedPlantCode: string;
  isLdapActive: boolean;
};

export async function ensureUsersTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME} (
      id BIGINT NOT NULL AUTO_INCREMENT,
      empId VARCHAR(32) NOT NULL,
      username VARCHAR(128) NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(128) NOT NULL,
      assignedPlantCode VARCHAR(32) NOT NULL DEFAULT '',
      isLdapActive TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_empId (empId),
      UNIQUE KEY uq_users_username (username)
    )
  `);

  const ensureColumn = async (columnName: string, definition: string) => {
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*) as c
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
      `,
      USERS_TABLE_SCHEMA,
      USERS_TABLE_NAME,
      columnName
    )) as Array<Record<string, unknown>>;
    const count = Number(rows[0]?.c ?? 0);
    if (count === 0) {
      await prisma.$executeRawUnsafe(
        `
          ALTER TABLE ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME}
          ADD COLUMN ${columnName} ${definition}
        `
      );
    }
  };

  await ensureColumn('empId', 'VARCHAR(32) NOT NULL DEFAULT \'\'');
  await ensureColumn('username', 'VARCHAR(128) NOT NULL DEFAULT \'\'');
  await ensureColumn('email', 'VARCHAR(255) NOT NULL DEFAULT \'\'');
  await ensureColumn('role', 'VARCHAR(128) NOT NULL DEFAULT \'User\'');
  await ensureColumn('assignedPlantCode', 'VARCHAR(32) NOT NULL DEFAULT \'\'');
  await ensureColumn('isLdapActive', 'TINYINT(1) NOT NULL DEFAULT 1');

  const seedCountRows = (await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as c FROM ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME}`
  )) as Array<Record<string, unknown>>;
  const count = Number(seedCountRows[0]?.c ?? 0);

  if (count === 0) {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME}
      (empId, username, email, role, assignedPlantCode, isLdapActive)
      VALUES
      ('1001', 'nuvoco\\admin', 'admin@nuvoco.com', 'System Administrator', '', 1),
      ('1004', 'nuvoco\\ashwini.sargar', 'ashwinisargar18@gmail.com', 'Safety Engineer', '', 1),
      ('1002', 'nuvoco\\safety_mgr', 'safety.manager@nuvoco.com', 'Safety Manager', '', 1),
      ('1003', 'nuvoco\\plant_head_bhiwani', 'planthead.bhiwani@nuvoco.com', 'Plant Head', 'BHI', 1)
    `
    );
  }

  // Keep Ashwini Sargar account aligned with the canonical login email (existing rows included).
  await prisma.$executeRawUnsafe(
    `
      UPDATE ${USERS_TABLE_SCHEMA}.${USERS_TABLE_NAME}
      SET email = ?
      WHERE username = ? OR empId = ?
    `,
    'ashwinisargar18@gmail.com',
    'nuvoco\\ashwini.sargar',
    '1004'
  );
}

export function mapUserRow(row: Record<string, unknown>): AppUser {
  return {
    id: Number(row.id ?? 0),
    empId: String(row.empId ?? ''),
    username: String(row.username ?? ''),
    email: String(row.email ?? ''),
    role: String(row.role ?? ''),
    assignedPlantCode: String(row.assignedPlantCode ?? ''),
    isLdapActive: Number(row.isLdapActive ?? 0) === 1,
  };
}
