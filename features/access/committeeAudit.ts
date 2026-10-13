import { randomUUID } from "node:crypto";
import { APIError, type PayloadRequest } from "payload";
import { sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import { workspaceTable } from "./delegatedAccess.ts";
import {
  committeeScopes,
  type CommitteeMembership,
  type CommitteeScope,
} from "./committeePolicy.ts";
export async function lockMembershipRecord(
  req: PayloadRequest,
  id: string | number,
) {
  const tx = (req.payload.db as unknown as PostgresAdapter).sessions[
    String(await req.transactionID)
  ]?.db;
  if (!tx)
    throw new APIError("Access changes require a database transaction.", 503);
  await tx.execute(
    sql`SELECT id FROM ${sql.raw(workspaceTable("users"))} WHERE id=${id} FOR UPDATE`,
  );
}
export async function auditMembershipChange(
  req: PayloadRequest,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
) {
  if (!req.user) return;
  const tx = (req.payload.db as unknown as PostgresAdapter).sessions[
    String(await req.transactionID)
  ]?.db;
  if (!tx)
    throw new APIError("Access changes require a database transaction.", 503);
  const previous = (before?.committeeMemberships ??
      []) as CommitteeMembership[],
    next = (after.committeeMemberships ?? []) as CommitteeMembership[];
  const changes: {
    committee: CommitteeScope;
    old: unknown;
    updated: unknown;
    action: string;
  }[] = committeeScopes.flatMap((committee) => {
    const old = previous.find((m) => m.committee === committee),
      updated = next.find((m) => m.committee === committee);
    return JSON.stringify(old) === JSON.stringify(updated)
      ? []
      : [
          {
            committee,
            old: old ?? null,
            updated: updated ?? null,
            action: !updated ? "remove" : !old ? "assign" : "change-or-renew",
          },
        ];
  });
  if (before?.role !== after.role || before?.status !== after.status)
    changes.push({
      committee: "National",
      old: { role: before?.role, status: before?.status },
      updated: { role: after.role, status: after.status },
      action: "account-status-or-role",
    });
  if (
    !changes.length &&
    before?.committeeAccessReviewedAt !== after.committeeAccessReviewedAt
  )
    changes.push({
      committee: "National",
      old: null,
      updated: null,
      action: "review-legacy-access",
    });
  for (const change of changes)
    await tx.execute(
      sql`INSERT INTO ${sql.raw(workspaceTable("committee_access_audit"))}(id,actor_id,target_id,committee,action,before_data,after_data) VALUES(${randomUUID()},${String(req.user.id)},${String(after.id)},${change.committee},${change.action},${JSON.stringify(change.old)}::jsonb,${JSON.stringify(change.updated)}::jsonb)`,
    );
}
