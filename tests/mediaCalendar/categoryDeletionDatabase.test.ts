import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { calendarSchemaSQL } from "../../features/mediaCalendar/schema";
import {
  checkRelations,
  deleteCategory,
  saveCategory,
  savePost,
} from "../../features/mediaCalendar/repository";
import { newPost } from "../../features/mediaCalendar/service";
import type { CalendarUser } from "../../features/mediaCalendar/types";
const url = process.env.MASCA_CALENDAR_TEST_DATABASE_URI;
describe.runIf(!!url)(
  "permanent category deletion in disposable Postgres",
  () => {
    let db: pg.Pool;
    const actor: CalendarUser = {
      id: "1",
      email: "qa@masca.org.au",
      status: "active",
      role: "administrator",
    };
    const type = (archived = true) => ({
      id: randomUUID(),
      name: "Disposable type",
      color: "#5959c9",
      archived,
    });
    beforeAll(async () => {
      const target = new URL(url!);
      if (
        target.hostname !== "127.0.0.1" ||
        target.pathname !== "/masca_calendar_type_qa"
      )
        throw new Error("Only the disposable local test database is allowed.");
      process.env.VERCEL_ENV = "preview";
      process.env.WORKSPACE_AUTH_ENABLED = "true";
      process.env.WORKSPACE_PREVIEW_SCHEMA = "cms_calendar_preview";
      db = new pg.Pool({ connectionString: url, max: 4 });
      (
        globalThis as typeof globalThis & { calendarPool?: pg.Pool }
      ).calendarPool = db;
      await db.query(
        "CREATE SCHEMA IF NOT EXISTS cms_calendar_preview; CREATE TABLE IF NOT EXISTS cms_calendar_preview.users(id text PRIMARY KEY,email text,status text,role text,calendar_access jsonb)",
      );
      await db.query(
        "INSERT INTO cms_calendar_preview.users VALUES('1','qa@masca.org.au','active','administrator',null),('2','view@masca.org.au','active','editor','{\"view\":true,\"edit\":false,\"approve\":false,\"designation\":null}') ON CONFLICT(id) DO NOTHING",
      );
      await db.query(calendarSchemaSQL("media_calendar_preview"));
    });
    beforeEach(async () => {
      await db.query("TRUNCATE media_calendar_preview.posts CASCADE");
    });
    afterAll(async () => {
      if (db) await db.end();
      delete (globalThis as typeof globalThis & { calendarPool?: pg.Pool })
        .calendarPool;
    });
    it("removes an unused archived type and rejects stale restores", async () => {
      const c = type();
      await saveCategory(actor, c, true);
      expect(await deleteCategory(actor, c.id)).toBe(c.id);
      await expect(
        saveCategory(actor, { ...c, archived: false }),
      ).rejects.toMatchObject({ status: 409 });
      expect(
        (
          await db.query(
            "SELECT id FROM media_calendar_preview.categories WHERE id=$1",
            [c.id],
          )
        ).rows,
      ).toHaveLength(0);
    });
    it("does not recreate permanently deleted default types during repeated initialization", async () => {
      const id = "00000000-0000-4000-8000-000000000001";
      const c = { id, name: "MASA", color: "#5959c9", archived: true };
      const exists = await db.query("SELECT 1 FROM media_calendar_preview.categories WHERE id=$1", [id]);
      await saveCategory(actor, c, !exists.rowCount);
      await deleteCategory(actor, id);
      await db.query(calendarSchemaSQL("media_calendar_preview"));
      expect((await db.query("SELECT 1 FROM media_calendar_preview.categories WHERE id=$1", [id])).rowCount).toBe(0);
    });
    it("rejects deleting an active type or a type attached to posts", async () => {
      const active = type(false);
      await saveCategory(actor, active, true);
      await expect(deleteCategory(actor, active.id)).rejects.toMatchObject({
        status: 409,
      });
      const used = type();
      await saveCategory(actor, used, true);
      const client = await db.connect();
      try {
        await savePost(client, newPost(actor, { category: used.id }));
      } finally {
        client.release();
      }
      await expect(deleteCategory(actor, used.id)).rejects.toMatchObject({
        status: 409,
      });
      expect(
        (
          await db.query(
            "SELECT id FROM media_calendar_preview.posts WHERE category=$1",
            [used.id],
          )
        ).rows,
      ).toHaveLength(1);
    });
    it("checks the current database permission before removing a type", async () => {
      const c = type();
      await saveCategory(actor, c, true);
      await expect(
        deleteCategory({ ...actor, id: "2" }, c.id),
      ).rejects.toMatchObject({ status: 403 });
      expect(
        (
          await db.query(
            "SELECT id FROM media_calendar_preview.categories WHERE id=$1",
            [c.id],
          )
        ).rows,
      ).toHaveLength(1);
    });
    it("waits for a concurrent post assignment and then preserves the referenced type", async () => {
      const c = type();
      await saveCategory(actor, c, true);
      const client = await db.connect();
      let deletion: Promise<unknown> | undefined;
      try {
        await client.query("BEGIN");
        const post = newPost(actor, { category: c.id });
        await checkRelations(client, post, false);
        deletion = deleteCategory(actor, c.id).catch((e) => e);
        await vi.waitFor(async () => {
          const blocked = await db.query(
            "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT data FROM %categories%FOR UPDATE'",
          );
          expect(blocked.rows.length).toBeGreaterThan(0);
        });
        await savePost(client, post);
        await client.query("COMMIT");
        expect(await deletion).toMatchObject({ status: 409 });
        expect(
          (
            await db.query(
              "SELECT id FROM media_calendar_preview.categories WHERE id=$1",
              [c.id],
            )
          ).rows,
        ).toHaveLength(1);
      } finally {
        await client.query("ROLLBACK");
        client.release();
        await deletion;
      }
    });
    it("makes identical creation retries idempotent without overwriting a changed type", async () => {
      const c = type();
      await saveCategory(actor, c, true);
      expect(await saveCategory(actor, c, true)).toEqual(c);
      await saveCategory(actor, { ...c, name: "Renamed by a teammate" });
      await expect(saveCategory(actor, c, true)).rejects.toMatchObject({
        status: 409,
      });
      expect(
        (
          await db.query(
            "SELECT data FROM media_calendar_preview.categories WHERE id=$1",
            [c.id],
          )
        ).rows[0].data.name,
      ).toBe("Renamed by a teammate");
    });
  },
);
