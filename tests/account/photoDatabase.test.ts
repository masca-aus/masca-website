import { beforeAll, afterAll, describe, expect, it } from "vitest";
import pg from "pg";
import { accountPhotoSchemaSQL } from "../../features/account/photoSchema";
import {
  accountPhotoInfo,
  readAccountPhoto,
  saveAccountPhoto,
  type PhotoActor,
} from "../../features/account/photoRepository";
import { syncCollaboration } from "../../features/mediaCalendar/collaboration";
import { calendarSchemaSQL } from "../../features/mediaCalendar/schema";
const url = process.env.MASCA_ACCOUNT_PHOTO_TEST_DATABASE_URI;
describe.runIf(!!url)("private account photos in disposable Postgres", () => {
  let db: pg.Pool;
  const actor: PhotoActor = {
    id: 1,
    email: "sarah@masca.org.au",
    status: "active",
    sessionRevision: "revision-one",
  };
  const teammate: PhotoActor = {
    id: 2,
    email: "amir@masca.org.au",
    status: "active",
    sessionRevision: "revision-two",
  };
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      target.hostname !== "127.0.0.1" ||
      target.pathname !== "/masca_account_photo_qa"
    )
      throw new Error("Only the disposable photo database is allowed.");
    Object.assign(process.env, {
      WORKSPACE_AUTH_ENABLED: "true",
      VERCEL_ENV: "preview",
      WORKSPACE_PREVIEW_SCHEMA: "cms_calendar_preview",
    });
    db = new pg.Pool({ connectionString: url, max: 4 });
    const globals = globalThis as typeof globalThis & {
      accountPhotoPool?: pg.Pool;
      calendarPool?: pg.Pool;
    };
    globals.accountPhotoPool = db;
    globals.calendarPool = db;
    await db.query(`DROP SCHEMA IF EXISTS cms_calendar_preview CASCADE; DROP SCHEMA IF EXISTS media_calendar_preview CASCADE; CREATE SCHEMA IF NOT EXISTS cms_calendar_preview;
      CREATE TABLE cms_calendar_preview.users(id integer PRIMARY KEY,email text,status text,role text,session_revision text,calendar_access jsonb);
      INSERT INTO cms_calendar_preview.users VALUES(1,'sarah@masca.org.au','active','administrator','revision-one',null),(2,'amir@masca.org.au','active','administrator','revision-two',null);
      DO $$ BEGIN CREATE ROLE anon;EXCEPTION WHEN duplicate_object THEN NULL;END $$;
      DO $$ BEGIN CREATE ROLE authenticated;EXCEPTION WHEN duplicate_object THEN NULL;END $$;`);
    await db.query(accountPhotoSchemaSQL("cms_calendar_preview"));
    await db.query(accountPhotoSchemaSQL("cms_calendar_preview"));
    await db.query(calendarSchemaSQL("media_calendar_preview"));
  });
  afterAll(async () => {
    await db?.end();
    const globals = globalThis as typeof globalThis & {
      accountPhotoPool?: pg.Pool;
      calendarPool?: pg.Pool;
    };
    delete globals.accountPhotoPool;
    delete globals.calendarPool;
  });
  it("saves only the actor photo, replaces it, and preserves account access/session", async () => {
    const before = (
      await db.query("SELECT * FROM cms_calendar_preview.users ORDER BY id")
    ).rows;
    const a = await saveAccountPhoto(actor, Buffer.from("first"));
    const b = await saveAccountPhoto(teammate, Buffer.from("teammate"));
    expect(a.photoVersion).not.toBe(b.photoVersion);
    expect((await readAccountPhoto(actor, "2")).photo.toString()).toBe(
      "teammate",
    );
    const replacement = await saveAccountPhoto(
      actor,
      Buffer.from("replacement"),
    );
    expect(replacement.photoVersion).not.toBe(a.photoVersion);
    expect((await readAccountPhoto(teammate, "1")).photo.toString()).toBe(
      "replacement",
    );
    expect(
      (await db.query("SELECT * FROM cms_calendar_preview.users ORDER BY id"))
        .rows,
    ).toEqual(before);
    await saveAccountPhoto(actor, null);
    expect((await accountPhotoInfo(actor)).photoVersion).toBeNull();
    expect((await readAccountPhoto(actor, "2")).photo.toString()).toBe(
      "teammate",
    );
  });
  it("rejects revoked sessions and suspended actors, and keeps photos off the Data API", async () => {
    await expect(
      saveAccountPhoto(
        { ...actor, sessionRevision: "old" },
        Buffer.from("bad"),
      ),
    ).rejects.toMatchObject({ status: 401 });
    await db.query(
      "UPDATE cms_calendar_preview.users SET status='suspended' WHERE id=1",
    );
    await expect(accountPhotoInfo(actor)).rejects.toMatchObject({
      status: 401,
    });
    await db.query(
      "UPDATE cms_calendar_preview.users SET status='active' WHERE id=1",
    );
    const { rows } = await db.query(
      "SELECT relrowsecurity,has_table_privilege('anon','cms_calendar_preview.account_photos','SELECT') AS anon_read,has_table_privilege('authenticated','cms_calendar_preview.account_photos','SELECT') AS authenticated_read FROM pg_class WHERE oid='cms_calendar_preview.account_photos'::regclass",
    );
    expect(rows[0]).toEqual({
      relrowsecurity: true,
      anon_read: false,
      authenticated_read: false,
    });
  });
  it("includes only the photo version in collaborator presence", async () => {
    const saved = await saveAccountPhoto(
      actor,
      Buffer.from("private-photo-bytes"),
    );
    const present = await syncCollaboration(
      { ...actor, role: "administrator", status: "active" },
      { clientId: crypto.randomUUID(), postId: null, cursor: null },
    );
    expect(present.participants[0].photoVersion).toBe(saved.photoVersion);
    expect(JSON.stringify(present)).not.toContain("private-photo-bytes");
  });
});
