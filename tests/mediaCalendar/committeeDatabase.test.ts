import { beforeAll, afterAll, it, expect, describe, vi } from "vitest";
import pg from "pg";
import { calendarSchemaSQL } from "../../features/mediaCalendar/schema";
import {
  createPost,
  overview,
  detail,
  mutatePost,
  saveCategory,
  sharingTargets,
} from "../../features/mediaCalendar/repository";
import { syncCollaboration } from "../../features/mediaCalendar/collaboration";
import { cancelUpload } from "../../features/mediaCalendar/assets";
import type { CalendarUser } from "../../features/mediaCalendar/types";
const url = process.env.MASCA_CALENDAR_COMMITTEE_TEST_DATABASE_URI;
describe.runIf(!!url)("committee calendar in disposable Postgres", () => {
  let db: pg.Pool;
  const actor = (id: string): CalendarUser => ({
    id,
    email: `person${id}@masca.org.au`,
    status: "active",
    role: "editor",
  });
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      target.hostname !== "127.0.0.1" ||
      target.pathname !== "/masca_calendar_committee_qa"
    )
      throw new Error(
        "Only the disposable calendar committee database is allowed.",
      );
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("WORKSPACE_AUTH_ENABLED", "true");
    vi.stubEnv("WORKSPACE_PREVIEW_SCHEMA", "cms_calendar_preview");
    vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
    db = new pg.Pool({ connectionString: url, max: 4 });
    (
      globalThis as typeof globalThis & { calendarPool?: pg.Pool }
    ).calendarPool = db;
    await db.query(
      "CREATE SCHEMA IF NOT EXISTS cms_calendar_preview; CREATE TABLE IF NOT EXISTS cms_calendar_preview.users(id text PRIMARY KEY,email text,status text,role text,calendar_access jsonb,committee_memberships jsonb,committee_access_reviewed_at timestamptz,committee_access_reviewed_by text); CREATE TABLE IF NOT EXISTS cms_calendar_preview.account_photos(user_id text PRIMARY KEY,version int)",
    );
    await db.query(calendarSchemaSQL("media_calendar_preview"));
    await db.query(
      "TRUNCATE media_calendar_preview.assets,media_calendar_preview.revisions,media_calendar_preview.notifications,media_calendar_preview.presence,media_calendar_preview.posts CASCADE",
    );
    for (const [id, committee, role] of [
      ["1", "QLD", "editor"],
      ["2", "NSW", "editor"],
      ["3", "QLD", "approver"],
      ["4", "NSW", "viewer"],
    ])
      await db.query(
        `INSERT INTO cms_calendar_preview.users(id,email,status,role,committee_memberships,committee_access_reviewed_at) VALUES($1,$2,'active','editor',$3,now()) ON CONFLICT(id) DO UPDATE SET committee_memberships=$3`,
        [
          id,
          `person${id}@masca.org.au`,
          JSON.stringify([
            {
              id: `m${id}`,
              committee,
              roles: { mediaCalendar: [role] },
              manager: false,
              expiresAt: "2099-01-01T00:00:00Z",
            },
          ]),
        ],
      );
  });
  afterAll(async () => {
    await db?.end();
    delete (globalThis as typeof globalThis & { calendarPool?: pg.Pool })
      .calendarPool;
    vi.unstubAllEnvs();
  });
  it("isolates lists, category ownership, history, mentions, presence and revoked uploads", async () => {
    const owner = actor("1"),
      other = actor("2");
    const p = await createPost(owner, {
      owningScope: "QLD",
      title: "QLD private",
    });
    await expect(detail(other, p.id)).rejects.toMatchObject({ status: 403 });
    expect(
      (
        await overview(
          other,
          "2026-01-01T00:00:00Z",
          "2027-01-01T00:00:00Z",
          0,
          "NSW",
        )
      ).posts,
    ).toEqual([]);
    await expect(
      saveCategory(
        other,
        {
          id: crypto.randomUUID(),
          owningScope: "National",
          name: "National takeover",
          color: "#000000",
          archived: false,
        },
        true,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      mutatePost(owner, p.id, {
        action: "comment",
        body: "Not an invitation",
        mentions: ["2"],
      }),
    ).rejects.toThrow("Mentions");
    await expect(
      syncCollaboration(other, {
        clientId: crypto.randomUUID(),
        postId: p.id,
        cursor: null,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect((await sharingTargets(owner, p.id)).map((m) => m.id)).toContain("2");
    const shared = await mutatePost(owner, p.id, {
      action: "share",
      expectedVersion: p.version,
      sharedWith: [{ userId: "2", role: "editor" }],
    });
    expect(
      (
        await overview(
          other,
          "2026-01-01T00:00:00Z",
          "2027-01-01T00:00:00Z",
          0,
          "NSW",
        )
      ).posts.map((p) => p.id),
    ).toContain(p.id);
    expect((await detail(other, p.id)).members.map((m) => m.id)).toContain("2");
    await expect(
      mutatePost(other, p.id, {
        action: "delete",
        expectedVersion: shared.version,
      }),
    ).rejects.toMatchObject({ status: 403 });
    const edited = await mutatePost(other, p.id, {
      action: "patch",
      expectedVersion: shared.version,
      patch: { title: "Shared content edit" },
    });
    const uploadId = crypto.randomUUID();
    await db.query(
      "INSERT INTO media_calendar_preview.assets(id,post_id,data) VALUES($1,$2,$3)",
      [
        uploadId,
        p.id,
        JSON.stringify({ id: uploadId, postId: p.id, ready: false }),
      ],
    );
    await mutatePost(owner, p.id, {
      action: "share",
      expectedVersion: edited.version,
      sharedWith: [],
    });
    await expect(cancelUpload(other, uploadId)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      syncCollaboration(other, {
        clientId: crypto.randomUUID(),
        postId: p.id,
        cursor: null,
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(detail(other, p.id)).rejects.toMatchObject({ status: 403 });
    expect(
      (
        await overview(
          other,
          "2026-01-01T00:00:00Z",
          "2027-01-01T00:00:00Z",
          0,
          "NSW",
        )
      ).posts,
    ).toEqual([]);
    const latest = (await detail(owner, p.id)).post;
    const two = await mutatePost(owner, p.id, {
      action: "share",
      expectedVersion: latest.version,
      sharedWith: [
        { userId: "2", role: "editor" },
        { userId: "4", role: "viewer" },
      ],
    });
    await db.query(
      "UPDATE cms_calendar_preview.users SET committee_memberships=jsonb_set(committee_memberships,'{0,expiresAt}','\"2020-01-01T00:00:00Z\"') WHERE id IN('2','4')",
    );
    const cleaned = await mutatePost(owner, p.id, {
      action: "share",
      expectedVersion: two.version,
      sharedWith: [{ userId: "4", role: "viewer" }],
    });
    expect(cleaned.sharedWith).toEqual([{ userId: "4", role: "viewer" }]);
    await expect(detail(actor("4"), p.id)).rejects.toMatchObject({
      status: 403,
    });
  });
});
