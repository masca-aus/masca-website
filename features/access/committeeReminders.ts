import pg from "pg";
import { randomUUID } from "node:crypto";
import { workspaceSchema } from "./workspaceEnvironment.ts";
import {
  committeeAccessEnabled,
  withCommitteeMode,
} from "./committeeEnvironment.ts";
import {
  approvedAccount,
  activeMemberships,
  type CommitteeAccount,
} from "./committeePolicy.ts";
import { remindersDue } from "./committeeMigration.ts";
const shared = globalThis as typeof globalThis & {
  committeeReminderPool?: pg.Pool;
};
function pool() {
  return (shared.committeeReminderPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URI,
    max: 2,
    connectionTimeoutMillis: 10000,
  }));
}
export async function generateTermReminders(now = Date.now()) {
  if (!committeeAccessEnabled()) return { created: 0 };
  const c = await pool().connect();
  let created = 0;
  try {
    await c.query("BEGIN");
    const { rows } = await c.query(
      `SELECT id,email,status,role,committee_memberships,committee_access_reviewed_at FROM "${workspaceSchema()}".users`,
    );
    const people = rows.map((r) =>
      withCommitteeMode({
        ...r,
        committeeMemberships: r.committee_memberships,
        committeeAccessReviewedAt: r.committee_access_reviewed_at,
      }),
    );
    for (const reminder of remindersDue(people, now)) {
      const result = await c.query(
        `INSERT INTO "${workspaceSchema()}".committee_access_reminders(id,recipient,membership_id,member_id,committee,expires_at,days_before) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(recipient,member_id,membership_id,expires_at,days_before) DO NOTHING RETURNING id`,
        [
          randomUUID(),
          reminder.recipient,
          reminder.membershipId,
          reminder.memberId,
          reminder.committee,
          reminder.expiresAt,
          reminder.daysBefore,
        ],
      );
      created += result.rowCount ?? 0;
    }
    await c.query("COMMIT");
    return { created };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function termReminders(actor: CommitteeAccount) {
  if (!committeeAccessEnabled()) return [];
  const { rows } = await pool().query(
    `SELECT id,email,status,role,committee_memberships,committee_access_reviewed_at FROM "${workspaceSchema()}".users WHERE id::text=$1`,
    [String(actor.id)],
  );
  const r = rows[0],
    user = r
      ? withCommitteeMode({
          ...r,
          committeeMemberships: r.committee_memberships,
          committeeAccessReviewedAt: r.committee_access_reviewed_at,
        })
      : null;
  if (!approvedAccount(user)) return [];
  const scopes =
    user.role === "administrator"
      ? null
      : activeMemberships(user)
          .filter((m) => m.manager)
          .map((m) => m.committee);
  const reminders = await pool().query(
    `SELECT r.id,r.committee,r.expires_at AS "expiresAt",r.days_before AS "daysBefore",split_part(u.email,'@',1) AS name FROM "${workspaceSchema()}".committee_access_reminders r JOIN "${workspaceSchema()}".users u ON u.id::text=r.member_id WHERE r.recipient=$1 AND r.read=false AND r.expires_at>now() AND ($2::text[] IS NULL OR r.committee=ANY($2::text[])) AND EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(u.committee_memberships,'[]')) m WHERE m->>'id'=r.membership_id AND (m->>'expiresAt')::timestamptz=r.expires_at) ORDER BY r.expires_at LIMIT 50`,
    [String(user.id), scopes],
  );
  return reminders.rows;
}
