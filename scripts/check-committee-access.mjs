import {workspaceCatalogSchemaSQL} from "../features/access/workspaces/schema.ts";
import assert from "node:assert/strict";
import pg from "pg";
import { committeeAccessSchemaSQL } from "../features/access/committeeSchema.ts";
import {
  saveMembership,
  listPeople,
  accessPool,
} from "../features/access/delegatedAccess.ts";
import { generateTermReminders } from "../features/access/committeeReminders.ts";
import { randomUUID } from "node:crypto";
const url = new URL(process.env.DATABASE_URI);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/committee_access_qa_20261013");
const db = new pg.Client({ connectionString: url.toString() });
await db.connect();
try {
  await db.query("CREATE SCHEMA IF NOT EXISTS cms_calendar_preview");
  await db.query(
    `CREATE TABLE IF NOT EXISTS cms_calendar_preview.users(id serial PRIMARY KEY,email text UNIQUE,role text,status text,calendar_access jsonb,session_revision text,created_at timestamptz,updated_at timestamptz)`,
  );
  for (const area of [
    "events",
    "careers",
    "committee",
    "sponsors",
    "organisations",
    "media",
  ])
    await db.query(
      `CREATE TABLE IF NOT EXISTS cms_calendar_preview.${area}(id serial PRIMARY KEY)`,
    );
  await db.query(
    committeeAccessSchemaSQL("cms_calendar_preview", "media_calendar_preview"),
  );
  // Stage with no seeded latest version, then snapshot the current row at activation.
  await db.query(
    "DELETE FROM cms_calendar_preview._organisations_v WHERE parent_id=88001",
  );
  await db.query(
    "DELETE FROM cms_calendar_preview.organisations WHERE id=88001",
  );
  await db.query(
    'INSERT INTO cms_calendar_preview.organisations(id,access_review) VALUES(88001,\'{"name":"Before legacy edit"}\')',
  );
  await db.query(
    committeeAccessSchemaSQL(
      "cms_calendar_preview",
      "media_calendar_preview",
      false,
    ),
  );
  assert.equal(
    (
      await db.query(
        "SELECT 1 FROM cms_calendar_preview._organisations_v WHERE parent_id=88001",
      )
    ).rowCount,
    0,
  );
  await db.query(
    'UPDATE cms_calendar_preview.organisations SET access_review=\'{"name":"Latest legacy edit"}\' WHERE id=88001',
  );
  await db.query(
    committeeAccessSchemaSQL(
      "cms_calendar_preview",
      "media_calendar_preview",
      true,
    ),
  );
  assert.equal(
    (
      await db.query(
        "SELECT version_access_review FROM cms_calendar_preview._organisations_v WHERE parent_id=88001 AND latest=true",
      )
    ).rows[0].version_access_review.name,
    "Latest legacy edit",
  );
  await db.query(
    'UPDATE cms_calendar_preview._organisations_v SET version_access_review=\'{"name":"Real committee draft"}\' WHERE parent_id=88001 AND latest=true',
  );
  await db.query(
    committeeAccessSchemaSQL(
      "cms_calendar_preview",
      "media_calendar_preview",
      true,
    ),
  );
  assert.equal(
    (
      await db.query(
        "SELECT version_access_review FROM cms_calendar_preview._organisations_v WHERE parent_id=88001 AND latest=true",
      )
    ).rows[0].version_access_review.name,
    "Real committee draft",
  );
  await db.query(
    committeeAccessSchemaSQL("cms_calendar_preview", "media_calendar_preview"),
  );
  await db.query(workspaceCatalogSchemaSQL("cms_calendar_preview","media_calendar_preview"));
  const m = (committee, manager = false) => ({
    id: randomUUID(),
    committee,
    roles: { events: ["editor"] },
    manager,
    expiresAt: "2027-06-30T14:00:00Z",
  });
  const manager = m("QLD", true),
    nsw = m("NSW"),
    vic = m("VIC");
  const now = new Date().toISOString();
  await db.query(
    `INSERT INTO cms_calendar_preview.users(id,email,role,status,committee_memberships,committee_access_reviewed_at) VALUES(1,'manager@masca.org.au','editor','active',$1,$2),(2,'member@masca.org.au','editor','active',$3,$2),(3,'national@masca.org.au','administrator','active','[]',$2) ON CONFLICT(id) DO UPDATE SET committee_memberships=EXCLUDED.committee_memberships,committee_access_reviewed_at=EXCLUDED.committee_access_reviewed_at`,
    [JSON.stringify([manager]), now, JSON.stringify([nsw, vic])],
  );
  const actor = {
    id: "1",
    email: "manager@masca.org.au",
    role: "editor",
    status: "active",
    committeeAccessReviewedAt: now,
    accessModel: "committee",
    committeeMemberships: [manager],
  };
  await saveMembership(actor, {
    targetId: "2",
    committee: "QLD",
    membership: m("QLD"),
  });
  let target = (
    await db.query(
      "SELECT committee_memberships FROM cms_calendar_preview.users WHERE id=2",
    )
  ).rows[0].committee_memberships;
  assert.deepEqual(
    target.filter((v) => v.committee !== "QLD"),
    [nsw, vic],
  );
  await assert.rejects(() =>
    saveMembership(actor, {
      targetId: "2",
      committee: "NSW",
      membership: m("NSW"),
    }),
  );
  await assert.rejects(() =>
    saveMembership(actor, {
      targetId: "2",
      committee: "QLD",
      membership: m("QLD", true),
    }),
  );
  await assert.rejects(() =>
    saveMembership(actor, {
      targetId: "1",
      committee: "QLD",
      membership: m("QLD"),
    }),
  );
  const platform = {
    id: "3",
    email: "national@masca.org.au",
    role: "administrator",
    status: "active",
  };
  await Promise.all([
    saveMembership(platform, {
      targetId: "2",
      committee: "QLD",
      membership: m("QLD"),
    }),
    saveMembership(platform, {
      targetId: "2",
      committee: "VIC",
      membership: m("VIC"),
    }),
  ]);
  target = (
    await db.query(
      "SELECT committee_memberships FROM cms_calendar_preview.users WHERE id=2",
    )
  ).rows[0].committee_memberships;
  assert.equal(target.length, 3);
  assert.equal(target.find((v) => v.committee === "NSW").id, nsw.id);
  await saveMembership(actor, {
    targetId: "2",
    committee: "QLD",
    membership: null,
  });
  const visible = await listPeople(actor, "QLD");
  assert.equal(
    visible.some((u) => u.id === "2"),
    false,
  );
  const stored = (
    await db.query(
      "SELECT role,status FROM cms_calendar_preview.users WHERE id=2",
    )
  ).rows[0];
  assert.deepEqual(stored, { role: "editor", status: "active" });
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM cms_calendar_preview.committee_access_audit",
      )
    ).rows[0].n >= 4,
    true,
  );
  await generateTermReminders(Date.parse("2027-05-31T12:00:00Z"));
  const before = (
    await db.query(
      "SELECT count(*)::int AS n FROM cms_calendar_preview.committee_access_reminders",
    )
  ).rows[0].n;
  await generateTermReminders(Date.parse("2027-05-31T12:00:00Z"));
  assert.ok(before > 0);
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM cms_calendar_preview.committee_access_reminders",
      )
    ).rows[0].n,
    before,
  );
  console.log(
    "PASS: migration idempotence, scoped delegation, foreign membership preservation, concurrent updates, audit and reminder idempotence.",
  );
} finally {
  await db.end();
  await accessPool().end();
  await globalThis.committeeReminderPool?.end();
}
