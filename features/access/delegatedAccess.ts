import pg from "pg";
import { randomUUID } from "node:crypto";
import { APIError } from "payload";
import { workspaceSchema } from "./workspaceEnvironment.ts";
import { withCommitteeMode } from "./committeeEnvironment.ts";
import {
  committeeScopes,
  activeMemberships,
  approvedAccount,
  mayDelegateMemberships,
  mayManageCommittee,
  validMemberships,
  type CommitteeAccount,
  type CommitteeMembership,
  type CommitteeScope,
} from "./committeePolicy.ts";
const pools = globalThis as typeof globalThis & {
  committeeAccessPool?: pg.Pool;
};
export const accessPool = () =>
  (pools.committeeAccessPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URI,
    max: 4,
    connectionTimeoutMillis: 10000,
  }));
export function workspaceTable(name: string) {
  if (
    ![
      "users",
      "committee_access_audit",
      "committee_access_reminders",
      "events",
      "careers",
      "committee",
      "sponsors",
      "organisations",
      "media",
      "_events_v",
      "_committee_v",
      "_sponsors_v",
    ].includes(name)
  )
    throw new Error("Invalid access table.");
  return `"${workspaceSchema()}"."${name}"`;
}
export function membershipChange(
  actor: CommitteeAccount,
  before: CommitteeMembership[],
  committee: CommitteeScope,
  membership: CommitteeMembership | null,
  targetId: string,
) {
  if (
    !committeeScopes.includes(committee) ||
    (membership && membership.committee !== committee)
  )
    throw new APIError("Choose one committee membership.", 400);
  const next = before
    .filter((m) => m.committee !== committee)
    .concat(membership ? [membership] : []);
  if (!validMemberships(next))
    throw new APIError(
      "Choose valid roles and an explicit term end date.",
      400,
    );
  if (
    !mayManageCommittee(actor, committee) ||
    !mayDelegateMemberships(actor, before, next, targetId)
  )
    throw new APIError("You cannot change this membership.", 403);
  return next;
}
function account(
  row: CommitteeAccount & {
    committee_memberships?: CommitteeMembership[];
    committee_access_reviewed_at?: string;
    committee_access_reviewed_by?: string;
  },
): CommitteeAccount {
  return withCommitteeMode({
    ...row,
    committeeMemberships: row.committee_memberships ?? [],
    committeeAccessReviewedAt: row.committee_access_reviewed_at,
    committeeAccessReviewedBy: row.committee_access_reviewed_by,
  });
}
/** Re-read and lock current authority and target; never trust stale browser grants. */
export async function saveMembership(
  actor: CommitteeAccount,
  input: {
    targetId?: string;
    email?: string;
    committee: CommitteeScope;
    membership: CommitteeMembership | null;
  },
) {
  const c = await accessPool().connect();
  try {
    await c.query("BEGIN");
    const { rows } = await c.query(
      `SELECT id,email,role,status,committee_memberships,committee_access_reviewed_at,committee_access_reviewed_by FROM ${workspaceTable("users")} WHERE id::text=ANY($1::text[]) ORDER BY id FOR UPDATE`,
      [[String(actor.id), ...(input.targetId ? [input.targetId] : [])]],
    );
    const current = rows.find((r) => String(r.id) === String(actor.id));
    if (
      !current ||
      !approvedAccount(account(current)) ||
      !mayManageCommittee(account(current), input.committee)
    )
      throw new APIError("Your access management authority has changed.", 403);
    const manager = account(current);
    let target = input.targetId
      ? rows.find((r) => String(r.id) === input.targetId)
      : null;
    if (input.targetId && !target) throw new APIError("Person not found.", 404);
    if (!input.targetId) {
      const email = input.email?.trim().toLowerCase();
      if (
        !email ||
        !/^[^\s@]+@masca\.org\.au$/.test(email) ||
        !input.membership
      )
        throw new APIError(
          "Invite an exact @masca.org.au email with a membership.",
          400,
        );
      await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [email]);
      const existing = await c.query(
        `SELECT id,email,role,status,committee_memberships,committee_access_reviewed_at,committee_access_reviewed_by FROM ${workspaceTable("users")} WHERE email=$1 FOR UPDATE`,
        [email],
      );
      target = existing.rows[0];
      if (!target) {
        membershipChange(
          manager,
          [],
          input.committee,
          input.membership,
          "new-invitation",
        );
        const created = await c.query(
          `INSERT INTO ${workspaceTable("users")}(email,role,status,session_revision,committee_memberships,committee_access_reviewed_at,committee_access_reviewed_by,created_at,updated_at) VALUES($1,'editor','invited',$2,'[]'::jsonb,now(),$3,now(),now()) RETURNING id,email,role,status,committee_memberships,committee_access_reviewed_at,committee_access_reviewed_by`,
          [email, randomUUID(), String(manager.id)],
        );
        target = created.rows[0];
      }
    }
    if (
      manager.role !== "administrator" &&
      !target.committee_access_reviewed_at
    )
      throw new APIError(
        "A platform administrator must review this existing account before committee delegation.",
        403,
      );
    const before = target.committee_memberships ?? [];
    const next = membershipChange(
      manager,
      before,
      input.committee,
      input.membership,
      String(target.id),
    );
    await c.query(
      `UPDATE ${workspaceTable("users")} SET committee_memberships=$1::jsonb,committee_access_revision=gen_random_uuid()::text,session_revision=$2,updated_at=now()${manager.role === "administrator" ? ",committee_access_reviewed_at=now(),committee_access_reviewed_by=$4" : ""} WHERE id=$3`,
      [
        JSON.stringify(next),
        randomUUID(),
        target.id,
        ...(manager.role === "administrator" ? [String(manager.id)] : []),
      ],
    );
    await c.query(
      `INSERT INTO ${workspaceTable("committee_access_audit")}(id,actor_id,target_id,committee,action,before_data,after_data,created_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,now())`,
      [
        randomUUID(),
        String(manager.id),
        String(target.id),
        input.committee,
        input.membership ? "assign-or-renew" : "remove",
        JSON.stringify(
          before.find(
            (m: CommitteeMembership) => m.committee === input.committee,
          ) ?? null,
        ),
        JSON.stringify(
          next.find((m) => m.committee === input.committee) ?? null,
        ),
      ],
    );
    await c.query("COMMIT");
    return {
      id: String(target.id),
      email: target.email,
      membership: next.find((m) => m.committee === input.committee) ?? null,
    };
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}
export async function listPeople(
  actor: CommitteeAccount,
  committee: CommitteeScope,
) {
  const { rows: actors } = await accessPool().query(
    `SELECT id,email,role,status,committee_memberships,committee_access_reviewed_at,committee_access_reviewed_by FROM ${workspaceTable("users")} WHERE id=$1`,
    [actor.id],
  );
  const manager = actors[0] ? account(actors[0]) : null;
  if (!mayManageCommittee(manager, committee))
    throw new APIError("You cannot manage this committee.", 403);
  const { rows } = await accessPool().query(
    `SELECT id,email,committee_memberships FROM ${workspaceTable("users")} WHERE committee_memberships @> $1::jsonb ORDER BY email`,
    [JSON.stringify([{ committee }])],
  );
  return rows.map((r) => ({
    id: String(r.id),
    email: r.email,
    membership: (r.committee_memberships as CommitteeMembership[]).find(
      (m) => m.committee === committee,
    ),
  }));
}
export const managedCommittees = (actor: CommitteeAccount) =>
  approvedAccount(actor)
    ? actor.role === "administrator"
      ? [...committeeScopes]
      : activeMemberships(actor)
          .filter((m) => m.manager)
          .map((m) => m.committee)
    : [];
