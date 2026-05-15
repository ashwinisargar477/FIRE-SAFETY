import { prisma } from '@/lib/prisma';
import { CEMENT_MASTER_PLANTS } from '@/data/cementMasterPlants';

const TABLE_SCHEMA = 'transporter';
const TABLE_NAME = 'tbl_plants';

export async function seedCementMasterPlantsIfMissing(): Promise<number> {
  let inserted = 0;
  for (const row of CEMENT_MASTER_PLANTS) {
    const found = (await prisma.$queryRawUnsafe(
      `
        SELECT id FROM ${TABLE_SCHEMA}.${TABLE_NAME}
        WHERE plantOffice = ?
        LIMIT 1
      `,
      row.plantOffice
    )) as Array<{ id: unknown }>;

    if (found.length > 0) continue;

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO ${TABLE_SCHEMA}.${TABLE_NAME}
        (division, subDivision, zone, plantOffice, companyCode, plantCode, showStatus, region, plant_unit, cluster, company_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      row.division,
      row.subDivision,
      row.zone,
      row.plantOffice,
      row.companyCode,
      row.plantCode,
      row.showStatus,
      row.region,
      row.plant_unit,
      row.cluster,
      row.company_name
    );
    inserted += 1;
  }
  return inserted;
}
