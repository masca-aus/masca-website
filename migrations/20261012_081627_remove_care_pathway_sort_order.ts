import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "care_pathways" DROP COLUMN "sort_order";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "care_pathways" ADD COLUMN "sort_order" numeric DEFAULT 1 NOT NULL;`)
}
