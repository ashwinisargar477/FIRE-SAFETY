import { prisma } from '@/lib/prisma';

export const EXTINGUISHER_TABLE_SCHEMA = 'transporter';
export const EXTINGUISHER_TABLE_NAME = 'tbl_extinguishers';
export const EXTINGUISHER_REL_TABLE_NAME = 'tbl_extinguisher_plant_rel';

export async function ensureExtinguisherTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${EXTINGUISHER_TABLE_SCHEMA}.${EXTINGUISHER_TABLE_NAME} (
      id VARCHAR(64) NOT NULL,
      division VARCHAR(100) NOT NULL DEFAULT '',
      subDivision VARCHAR(100) NOT NULL DEFAULT '',
      zone VARCHAR(100) NOT NULL DEFAULT '',
      plantOffice VARCHAR(255) NOT NULL DEFAULT '',
      plantId INT NULL,
      companyCode VARCHAR(32) NOT NULL,
      plantCode VARCHAR(32) NOT NULL,
      plant VARCHAR(255) NOT NULL,
      showStatus VARCHAR(32) NOT NULL DEFAULT 't',
      region VARCHAR(100) NOT NULL DEFAULT '',
      plant_unit VARCHAR(100) NOT NULL DEFAULT '',
      cluster VARCHAR(100) NOT NULL DEFAULT '',
      company_name VARCHAR(255) NOT NULL DEFAULT '',
      make VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      media VARCHAR(50) NOT NULL,
      capacity VARCHAR(50) NOT NULL,
      locationWithElevation VARCHAR(255) NOT NULL,
      lastUtTestDate DATE NOT NULL,
      manufacturingDate DATE NOT NULL,
      nextUtTestDate DATE NOT NULL,
      installedBy VARCHAR(255) NOT NULL,
      installedDate DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);

  const ensureColumn = async (columnName: string, columnSql: string) => {
    const existing = (await prisma.$queryRawUnsafe(
      `
        SELECT COLUMN_NAME
        FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ? AND column_name = ?
      `,
      EXTINGUISHER_TABLE_SCHEMA,
      EXTINGUISHER_TABLE_NAME,
      columnName
    )) as Array<Record<string, unknown>>;

    if (existing.length === 0) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE ${EXTINGUISHER_TABLE_SCHEMA}.${EXTINGUISHER_TABLE_NAME} ADD COLUMN ${columnSql}`
      );
    }
  };

  await ensureColumn('showStatus', "showStatus VARCHAR(32) NOT NULL DEFAULT 't'");
  await ensureColumn('division', "division VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumn('subDivision', "subDivision VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumn('zone', "zone VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumn('plantOffice', "plantOffice VARCHAR(255) NOT NULL DEFAULT ''");
  await ensureColumn('region', "region VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumn('plant_unit', "plant_unit VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumn('cluster', "cluster VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumn('company_name', "company_name VARCHAR(255) NOT NULL DEFAULT ''");
  await ensureColumn('archived_at', 'archived_at DATETIME NULL DEFAULT NULL');
  await ensureColumn('archived_reason', 'archived_reason VARCHAR(255) NULL DEFAULT NULL');
  await ensureColumn('hydraulicDueDate', 'hydraulicDueDate DATE NULL DEFAULT NULL');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${EXTINGUISHER_TABLE_SCHEMA}.${EXTINGUISHER_REL_TABLE_NAME} (
      relationId BIGINT NOT NULL AUTO_INCREMENT,
      extinguisherId VARCHAR(64) NOT NULL,
      plantId INT NOT NULL,
      companyCode VARCHAR(32) NOT NULL,
      plantCode VARCHAR(32) NOT NULL,
      linkedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (relationId),
      UNIQUE KEY uq_extinguisher_plant (extinguisherId, plantId)
    )
  `);
}
