// Prepare a branch-specific preview schema. This must never connect the
// preview's CMS schema to the live public collection tables.
import pg from "pg";
import { defaultCarePathways } from "../features/care/carePathwayDefaults.ts";

const schema = process.env.WORKSPACE_PREVIEW_SCHEMA;
if (
  process.env.VERCEL_ENV !== "preview" ||
  !schema ||
  !/^cms_[a-z0-9_]+_preview$/.test(schema)
) {
  throw new Error("A valid branch preview schema is required; refusing to initialize.");
}

const connection = new pg.Client({ connectionString: process.env.DATABASE_URI });
await connection.connect();
try {
  await connection.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  const legacyCarePathways = await connection.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'care_pathways' AND column_name = 'category'",
    [schema],
  );
  if (legacyCarePathways.rowCount) {
    await connection.query("BEGIN");
    try {
      await connection.query(`
        ALTER TABLE "${schema}"."care_pathways" ADD COLUMN IF NOT EXISTS "parent_id" integer;
        ALTER TABLE "${schema}"."care_pathways" ADD COLUMN IF NOT EXISTS "detail" varchar;
        ALTER TABLE "${schema}"."care_pathways" ADD COLUMN IF NOT EXISTS "link_url" varchar;
        DROP INDEX IF EXISTS "${schema}"."care_pathways_category_idx";
        ALTER TABLE "${schema}"."care_pathways" DROP COLUMN "category";
        DROP TYPE IF EXISTS "${schema}"."enum_care_pathways_category";
        INSERT INTO "${schema}"."care_pathways" ("title", "short_description", "sort_order", "parent_id", "link_url")
        SELECT subsection."title", subsection."detail", subsection."_order" + 1, subsection."_parent_id", subsection."link_url"
        FROM "${schema}"."care_pathways_subsections" AS subsection
        ORDER BY subsection."_parent_id", subsection."_order";
        ALTER TABLE "${schema}"."care_pathways_subsections" DISABLE ROW LEVEL SECURITY;
        DROP TABLE "${schema}"."care_pathways_subsections" CASCADE;
        DO $$ BEGIN
          ALTER TABLE "${schema}"."care_pathways"
            ADD CONSTRAINT "care_pathways_parent_id_care_pathways_id_fk"
            FOREIGN KEY ("parent_id") REFERENCES "${schema}"."care_pathways"("id") ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        CREATE INDEX IF NOT EXISTS "care_pathways_parent_idx" ON "${schema}"."care_pathways" ("parent_id");
      `);
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    }
  }
  const legacySortOrder = await connection.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'care_pathways' AND column_name = 'sort_order'",
    [schema],
  );
  if (legacySortOrder.rowCount) {
    await connection.query(`ALTER TABLE "${schema}"."care_pathways" DROP COLUMN "sort_order"`);
  }
  const tables = await connection.query(
    "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1",
    [schema],
  );
  process.env.WORKSPACE_INIT_SCHEMA = tables.rows[0].count === 0 ? "true" : "false";
} finally {
  await connection.end();
}

Object.assign(process.env, { NODE_ENV: "development" });
const { getPayload } = await import("payload");
const { default: config } = await import("../payload.config.ts");
const payload = await getPayload({ config });
let bootstrapError: unknown;
try {
  if (payload.db.schemaName !== schema) {
    throw new Error("Payload connected to a different schema; refusing to seed preview content.");
  }

  const existing = await payload.find({
    collection: "care-pathways",
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (!existing.totalDocs) {
    const seedChildren = async (nodes: typeof defaultCarePathways, parent?: number) => {
      for (const node of nodes) {
        const { children, ...fields } = node;
        const created = await payload.create({
          collection: "care-pathways",
          data: { ...fields, ...(parent ? { parent } : {}) },
          overrideAccess: true,
        });
        if (children?.length) await seedChildren(children, created.id);
      }
    };
    await seedChildren(defaultCarePathways);
  }

  const access = new pg.Client({ connectionString: process.env.DATABASE_URI });
  await access.connect();
  try {
    await access.query(`REVOKE ALL ON SCHEMA "${schema}" FROM PUBLIC, anon, authenticated`);
    const tables = await access.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = $1",
      [schema],
    );
    for (const { tablename } of tables.rows as { tablename: string }[]) {
      if (!/^[a-z0-9_]+$/.test(tablename)) throw new Error("Unexpected table name in the preview schema.");
      await access.query(`ALTER TABLE "${schema}"."${tablename}" ENABLE ROW LEVEL SECURITY`);
      await access.query(`REVOKE ALL ON TABLE "${schema}"."${tablename}" FROM anon, authenticated`);
    }
    const sequences = await access.query(
      "SELECT sequencename FROM pg_sequences WHERE schemaname = $1",
      [schema],
    );
    for (const { sequencename } of sequences.rows as { sequencename: string }[]) {
      if (!/^[a-z0-9_]+$/.test(sequencename)) throw new Error("Unexpected sequence name in the preview schema.");
      await access.query(`REVOKE ALL ON SEQUENCE "${schema}"."${sequencename}" FROM anon, authenticated`);
    }
  } finally {
    await access.end();
  }
  console.log(`Isolated Cares preview schema ${schema} is ready.`);
} catch (error) {
  bootstrapError = error;
  console.error(error);
} finally {
  void payload.db.pool?.end().catch(() => {});
  await payload.destroy();
}
process.exit(bootstrapError ? 1 : 0);
