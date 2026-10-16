import { beforeAll, afterAll, describe, expect, it } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { calendarSchemaSQL } from "../../features/mediaCalendar/schema";
import { detail, savePost } from "../../features/mediaCalendar/repository";
import { newPost } from "../../features/mediaCalendar/service";
import type { CalendarUser } from "../../features/mediaCalendar/types";
const url = process.env.MASCA_CALENDAR_EDITOR_TEST_DATABASE_URI;
describe.runIf(!!url)("post detail in disposable Postgres", () => {
  let db: pg.Pool;
  const actor: CalendarUser = {
    id: "1",
    email: "qa@masca.org.au",
    status: "active",
    role: "administrator",
  };
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      target.hostname !== "127.0.0.1" ||
      target.pathname !== "/masca_calendar_editor_qa"
    )
      throw new Error("Only the disposable editor database is allowed.");
    Object.assign(process.env, {
      VERCEL_ENV: "preview",
      WORKSPACE_AUTH_ENABLED: "true",
      WORKSPACE_PREVIEW_SCHEMA: "cms_calendar_preview",
    });
    db = new pg.Pool({
      connectionString: url,
      max: 4,
      options: "-c statement_timeout=750",
    });
    (
      globalThis as typeof globalThis & { calendarPool?: pg.Pool }
    ).calendarPool = db;
    await db.query(
      "CREATE SCHEMA IF NOT EXISTS cms_calendar_preview; CREATE TABLE IF NOT EXISTS cms_calendar_preview.users(id text PRIMARY KEY,email text,status text,role text,calendar_access jsonb,committee_memberships jsonb,committee_access_reviewed_at timestamptz,committee_access_reviewed_by text); INSERT INTO cms_calendar_preview.users(id,email,status,role,calendar_access) VALUES('1','qa@masca.org.au','active','administrator',null),('2','view@masca.org.au','active','editor',null) ON CONFLICT(id) DO NOTHING",
    );
    await db.query(calendarSchemaSQL("media_calendar_preview"));
  });
  afterAll(async () => {
    await db?.end();
    delete (globalThis as typeof globalThis & { calendarPool?: pg.Pool })
      .calendarPool;
  });
  it("opens the committed snapshot while another teammate is saving the same post", async () => {
    const writer = await db.connect();
    const post = newPost(actor, { title: "Committed draft" });
    try {
      await savePost(writer, post);
      await writer.query("BEGIN");
      await writer.query(
        "UPDATE media_calendar_preview.posts SET data=jsonb_set(data,'{title}', '\"Uncommitted edit\"') WHERE id=$1",
        [post.id],
      );
      const start = performance.now();
      const opened = await detail(actor, post.id);
      console.info(
        `Post opens during a pending write: ${Math.round(performance.now() - start)}ms`,
      );
      expect(opened.post.title).toBe("Committed draft");
      expect(opened.assets).toEqual([]);
    } finally {
      await writer.query("ROLLBACK");
      writer.release();
    }
  });
  it("returns ordered attached assets, active pending uploads and bounded history", async () => {
    const client = await db.connect();
    const post = newPost(actor, { title: "Snapshot detail" });
    const first = randomUUID(),
      second = randomUUID(),
      pending = randomUUID(),
      cancelled = randomUUID();
    post.assets = [second, first];
    try {
      await savePost(client, post);
      for (const [id, ready, cancel] of [
        [first, true, false],
        [second, true, false],
        [pending, false, false],
        [cancelled, false, true],
      ] as const)
        await client.query(
          "INSERT INTO media_calendar_preview.assets(id,post_id,data) VALUES($1,$2,$3)",
          [
            id,
            post.id,
            JSON.stringify({
              id,
              postId: post.id,
              ready,
              cancelled: cancel,
              createdAt: new Date().toISOString(),
            }),
          ],
        );
      for (let i = 0; i < 32; i++)
        await client.query(
          "INSERT INTO media_calendar_preview.revisions(post_id,author,action,data,created_at) VALUES($1,'1','patch',$2,$3)",
          [
            post.id,
            JSON.stringify({ contentRevision: i }),
            new Date(1700000000000 + i * 1000),
          ],
        );
      const opened = await detail(actor, post.id);
      expect(opened.assets.map((a) => a.id)).toEqual([second, first]);
      expect(opened.pendingUploads.map((a) => a.id)).toEqual([pending]);
      expect(opened.history).toHaveLength(30);
      expect(opened.history[0].revision).toBe("31");
      expect(opened.history[29].revision).toBe("2");
      await expect(
        detail({ ...actor, id: "2" }, post.id),
      ).rejects.toMatchObject({ status: 403 });
      await expect(detail(actor, randomUUID())).rejects.toMatchObject({
        status: 404,
      });
      post.deletedAt = new Date().toISOString();
      await savePost(client, post);
      await expect(detail(actor, post.id)).rejects.toMatchObject({
        status: 404,
      });
    } finally {
      client.release();
    }
  });
});
