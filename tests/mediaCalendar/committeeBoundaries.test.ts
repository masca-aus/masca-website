import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  detail,
  saveCategory,
  mutatePost,
  checkRelations,
} from "../../features/mediaCalendar/repository";
import { syncCollaboration } from "../../features/mediaCalendar/collaboration";
import {
  cancelUpload,
  initUpload,
  finishUpload,
  assetURL,
} from "../../features/mediaCalendar/assets";
import { newPost } from "../../features/mediaCalendar/service";
import type { CalendarUser } from "../../features/mediaCalendar/types";
import type pg from "pg";
const actor: CalendarUser = {
  id: "1",
  email: "one@masca.org.au",
  status: "active",
  role: "editor",
  calendarAccess: { view: true, edit: true, approve: false, designation: null },
};
const row = {
  ...actor,
  calendar_access: actor.calendarAccess,
  committee_access_reviewed_at: "2026-01-01",
  committee_memberships: [
    {
      id: "m",
      committee: "NSW",
      roles: { mediaCalendar: ["editor"] },
      manager: false,
      expiresAt: "2099-01-01T00:00:00Z",
    },
  ],
};
const p = {
  ...newPost(actor, {}),
  owningScope: "QLD" as const,
  sharedWith: [],
};
const client = { query: vi.fn(), release: vi.fn() };
beforeEach(() => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  client.query.mockImplementation(async (sql: string) => {
    if (sql.includes(".users")) return { rows: [row] };
    if (sql.includes("AS post,"))
      return {
        rows: [{ post: p, assets: [], pendingUploads: [], history: [] }],
      };
    if (sql.includes('"posts"')) return { rows: [{ data: p }] };
    if (sql.includes('"assets"'))
      return { rows: [{ data: { id: "asset", postId: p.id, ready: false } }] };
    if (sql.includes('"categories"'))
      return {
        rows: [
          { data: { id: "cat", owningScope: "National", archived: true } },
        ],
      };
    return { rows: [] };
  });
  (globalThis as typeof globalThis & { calendarPool?: pg.Pool }).calendarPool =
    { connect: async () => client } as unknown as pg.Pool;
});
afterEach(() => {
  delete (globalThis as typeof globalThis & { calendarPool?: pg.Pool })
    .calendarPool;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it("does not expose a private detail or its history", async () => {
  await expect(detail(actor, p.id)).rejects.toMatchObject({ status: 403 });
});
it("does not expose a private tombstone during caption polling", async () => {
  await expect(
    syncCollaboration(actor, {
      clientId: crypto.randomUUID(),
      postId: p.id,
      cursor: null,
    }),
  ).rejects.toMatchObject({ status: 403 });
});
it("rejects cancelling another committees upload", async () => {
  await expect(cancelUpload(actor, "asset")).rejects.toMatchObject({
    status: 403,
  });
});
it("rejects a category ownership rewrite before an update", async () => {
  await expect(
    saveCategory(actor, {
      id: "cat",
      owningScope: "NSW",
      name: "Hijack",
      color: "#000000",
      archived: true,
    }),
  ).rejects.toMatchObject({ status: 403 });
});
it("validates mentions against current record access without granting it", async () => {
  await expect(
    mutatePost(actor, p.id, {
      action: "comment",
      body: "secret",
      mentions: ["1"],
    }),
  ).rejects.toMatchObject({ status: 403 });
});
it("rejects assigning a National category to a state draft", async () => {
  await expect(
    checkRelations(
      client as unknown as pg.PoolClient,
      { ...p, category: "cat" },
      false,
    ),
  ).rejects.toThrow("committee");
});

it("denies each asset boundary without contacting storage for private records", async () => {
  vi.stubEnv("CALENDAR_PRIVATE_PREVIEW_BUCKET", "private-committee-qa");
  vi.stubEnv("S3_REGION", "us-east-1");
  await expect(
    initUpload(actor, p.id, "image.jpg", "image/jpeg", 100),
  ).rejects.toMatchObject({ status: 403 });
  await expect(finishUpload(actor, "asset", 1)).rejects.toMatchObject({
    status: 403,
  });
  await expect(assetURL(actor, "asset", true, false)).rejects.toMatchObject({
    status: 403,
  });
  await expect(assetURL(actor, "asset", false, true)).rejects.toMatchObject({
    status: 403,
  });
});
