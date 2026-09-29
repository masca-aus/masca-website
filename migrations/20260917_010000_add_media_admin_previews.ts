import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

// Stores metadata for the compact `admin-preview` derivative generated for
// future media uploads. Existing original files and CMS entries are unchanged.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media"
      ADD COLUMN IF NOT EXISTS "focal_x" numeric,
      ADD COLUMN IF NOT EXISTS "focal_y" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_admin_preview_url" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_admin_preview_width" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_admin_preview_height" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_admin_preview_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_admin_preview_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_admin_preview_filename" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media"
      DROP COLUMN IF EXISTS "sizes_admin_preview_filename",
      DROP COLUMN IF EXISTS "sizes_admin_preview_filesize",
      DROP COLUMN IF EXISTS "sizes_admin_preview_mime_type",
      DROP COLUMN IF EXISTS "sizes_admin_preview_height",
      DROP COLUMN IF EXISTS "sizes_admin_preview_width",
      DROP COLUMN IF EXISTS "sizes_admin_preview_url",
      DROP COLUMN IF EXISTS "focal_y",
      DROP COLUMN IF EXISTS "focal_x";
  `);
}
