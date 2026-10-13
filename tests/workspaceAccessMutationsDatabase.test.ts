import { sharedAccessRecords } from "../features/access/workspaces/sharing.ts";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import pg from "pg";
import { workspaceCatalogSchemaSQL } from "../features/access/workspaces/schema";
import { accessSnapshot } from "../features/access/workspaces/graph";
import { accessHistory } from "../features/access/workspaces/history";
import { mutateAccess } from "../features/access/workspaces/mutations";
const uri = process.env.MASCA_WORKSPACE_TEST_DATABASE_URI;
describe.runIf(!!uri)("transactional workspace access", () => {
  let db: pg.Pool;
  const admin = {
    id: "1",
    email: "admin@masca.org.au",
    role: "administrator",
    status: "active",
  };
  const manager = {
    id: "2",
    email: "manager@masca.org.au",
    role: "editor",
    status: "active",
  };
  beforeAll(async () => {
    const u = new URL(uri!);
    if (
      u.hostname !== "127.0.0.1" ||
      u.pathname !== "/masca_workspace_access_qa"
    )
      throw Error("Local test database only");
    vi.stubEnv("WORKSPACE_AUTH_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("WORKSPACE_PREVIEW_SCHEMA", "cms_calendar_preview");
    vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
    db = new pg.Pool({ connectionString: uri, max: 4 });
    (
      globalThis as typeof globalThis & { committeeAccessPool?: pg.Pool }
    ).committeeAccessPool = db;
    await db.query(`DROP SCHEMA IF EXISTS cms_calendar_preview CASCADE;CREATE SCHEMA cms_calendar_preview;
 CREATE TABLE cms_calendar_preview.users(id serial PRIMARY KEY,email text UNIQUE,display_name text,status text,role text,session_revision text,committee_memberships jsonb DEFAULT '[]',committee_access_revision text DEFAULT gen_random_uuid()::text,committee_access_reviewed_at timestamptz,committee_access_reviewed_by text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
 CREATE TABLE cms_calendar_preview.committee_access_audit(id uuid PRIMARY KEY,actor_id text,target_id text,committee text,action text,before_data jsonb,after_data jsonb,created_at timestamptz DEFAULT now());
 INSERT INTO cms_calendar_preview.users(email,status,role,committee_access_reviewed_at) VALUES('admin@masca.org.au','active','administrator',now()),('manager@masca.org.au','active','editor',now()),('syed@masca.org.au','active','editor',now());`);
    await db.query(
      workspaceCatalogSchemaSQL("cms_calendar_preview", "media_calendar"),
    );
    await db.query(
      `UPDATE cms_calendar_preview.users SET committee_memberships=$1 WHERE id=2`,
      [
        JSON.stringify([
          {
            id: "m2",
            committee: "QLD",
            roles: {},
            manager: true,
            expiresAt: "2099-01-01T00:00:00Z",
          },
        ]),
      ],
    );
  });
  afterAll(async () => {
    await db?.end();
    delete (globalThis as typeof globalThis & { committeeAccessPool?: pg.Pool })
      .committeeAccessPool;
    vi.unstubAllEnvs();
  });
  it("manager metadata is limited to managed workspaces", async () => {
    const s = await accessSnapshot(manager);
    expect(s.workspaces.map((w) => w.id)).toEqual(["QLD"]);
    expect(s.viewer.create).toBe(false);
    expect(s.people.map((p) => p.email)).toEqual(["manager@masca.org.au"]);
    await expect(
      mutateAccess(manager, {
        type: "createWorkspace",
        name: "VIC project",
        kind: "project",
        areas: ["events"],
        termEnd: null,
        sponsorId: null,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("creates and configures a project without granting content", async () => {
    const { snapshot } = await mutateAccess(admin, {
      type: "createWorkspace",
      name: "MASA",
      kind: "project",
      areas: ["mediaCalendar"],
      termEnd: null,
      sponsorId: null,
    });
    const w = snapshot.workspaces.find((w) => w.name === "MASA")!;
    const configured = await mutateAccess(admin, {
      type: "configureWorkspace",
      workspaceId: w.id,
      expectedRevision: w.revision,
      name: w.name,
      kind: w.kind,
      areas: ["mediaCalendar", "events"],
      termEnd: null,
      sponsorId: null,
    });
    expect(
      configured.snapshot.memberships.filter((m) => m.committee === w.id),
    ).toEqual([]);
  });
  it("serialises same-revision updates and preserves unrelated roles/expiry", async () => {
    let s = await accessSnapshot(admin);
    const w = s.workspaces.find((w) => w.name === "MASA")!;
    const person = s.people.find((p) => p.id === "3")!;
    s = (
      await mutateAccess(admin, {
        type: "assignArea",
        workspaceId: w.id,
        expectedWorkspaceRevision: w.revision,
        targetId: person.id,
        expectedRevision: person.revision,
        area: "mediaCalendar",
        roles: ["editor"],
        expiresAt: "2099-01-01T12:34:56.123Z",
      })
    ).snapshot;
    const p = s.people.find((p) => p.id === "3")!;
    const input = {
      type: "assignArea" as const,
      workspaceId: w.id,
      expectedWorkspaceRevision: w.revision,
      targetId: "3",
      expectedRevision: p.revision,
      area: "events" as const,
      roles: ["editor" as const],
    };
    const results = await Promise.allSettled([
      mutateAccess(admin, input),
      mutateAccess(admin, input),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const m = (await accessSnapshot(admin)).memberships.find(
      (m) => m.committee === w.id && m.userId === "3",
    )!;
    expect(m.roles).toEqual({ mediaCalendar: ["editor"], events: ["editor"] });
    expect(m.expiresAt).toBe("2099-01-01T12:34:56.123Z");
    await expect(
      mutateAccess(admin, {
        type: "configureWorkspace",
        workspaceId: w.id,
        expectedRevision: w.revision,
        name: "MASA",
        kind: "project",
        areas: ["events"],
        termEnd: null,
        sponsorId: null,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("management-only metadata excludes private titles and bounds audit/share scope", async () => {
    await db.query(
      `CREATE TABLE cms_calendar_preview.events(id serial PRIMARY KEY,owning_scope text,title text,access_creator text,access_contributors jsonb,shared_with jsonb);INSERT INTO cms_calendar_preview.events(owning_scope,title,access_creator,access_contributors,shared_with) VALUES('QLD','Private draft title','3','[]','[{"userId":"3","role":"viewer"}]')`,
    );
    const records = await sharedAccessRecords(manager, "QLD");
    expect(records).toHaveLength(1);
    expect(records[0].label).toBe("Events record #1");
    expect(JSON.stringify(records)).not.toContain("Private draft title");
    expect(records[0].canManage).toBe(false);
    await expect(sharedAccessRecords(manager, "VIC")).rejects.toMatchObject({
      status: 403,
    });
    const history = await accessHistory(manager, "QLD");
    expect(JSON.stringify(history)).not.toContain("Private draft title");
  });
  it("manager renewal is capped and removal preserves other workspaces", async () => {
    const s = await accessSnapshot(admin),
      w = s.workspaces.find((w) => w.id === "QLD")!,
      p = s.people.find((p) => p.id === "3")!;
    await mutateAccess(manager, {
      type: "assignArea",
      workspaceId: w.id,
      expectedWorkspaceRevision: w.revision,
      targetId: p.id,
      expectedRevision: p.revision,
      area: "events",
      roles: ["viewer"],
      expiresAt: "2098-01-01T00:00:00Z",
    });
    const latest = (await accessSnapshot(manager)).people.find(
      (p) => p.id === "3",
    )!;
    await expect(
      mutateAccess(manager, {
        type: "renewMembership",
        workspaceId: w.id,
        expectedWorkspaceRevision: w.revision,
        targetId: p.id,
        expectedRevision: latest.revision,
        expiresAt: "2100-01-01T00:00:00Z",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await mutateAccess(manager, {
      type: "removeMembership",
      workspaceId: w.id,
      expectedWorkspaceRevision: w.revision,
      targetId: p.id,
      expectedRevision: latest.revision,
    });
    const after = (await accessSnapshot(admin)).memberships.filter(
      (m) => m.userId === "3",
    );
    expect(after.map((m) => m.committee)).toEqual([
      s.workspaces.find((w) => w.name === "MASA")!.id,
    ]);
    expect(after[0].expiresAt).toBe("2099-01-01T12:34:56.123Z");
  });
  it("rejects stale manager authority and archive at save time", async () => {
    const s = await accessSnapshot(admin),
      w = s.workspaces.find((w) => w.id === "QLD")!,
      person = s.people.find((p) => p.id === "3")!;
    const input = {
      type: "assignArea" as const,
      workspaceId: w.id,
      expectedWorkspaceRevision: w.revision,
      targetId: person.id,
      expectedRevision: person.revision,
      area: "events" as const,
      roles: ["viewer" as const],
      expiresAt: "2098-01-01T00:00:00Z",
    };
    await db.query(
      "UPDATE cms_calendar_preview.users SET committee_memberships='[]' WHERE id=2",
    );
    await expect(mutateAccess(manager, input)).rejects.toMatchObject({
      status: 403,
    });
    await expect(accessHistory(manager, "VIC")).rejects.toMatchObject({
      status: 403,
    });
    await mutateAccess(admin, {
      type: "archiveWorkspace",
      workspaceId: w.id,
      expectedRevision: w.revision,
    });
    await expect(mutateAccess(admin, input)).rejects.toMatchObject({
      status: 403,
    });
  });
  it("reuses normalised email; account creation grants nothing", async () => {
    await mutateAccess(admin, {
      type: "addPerson",
      name: "New",
      email: " New@masca.org.au ",
    });
    await mutateAccess(admin, {
      type: "addPerson",
      name: "New",
      email: "new@masca.org.au",
    });
    const s = await accessSnapshot(admin);
    const p = s.people.find((p) => p.email === "new@masca.org.au")!;
    expect(
      s.people.filter((person) => person.email === "new@masca.org.au"),
    ).toHaveLength(1);
    expect(s.memberships.some((m) => m.userId === p.id)).toBe(false);
    expect(
      (
        await db.query(
          "SELECT count(*)::int n FROM cms_calendar_preview.users WHERE email='new@masca.org.au'",
        )
      ).rows[0].n,
    ).toBe(1);
  });
});
