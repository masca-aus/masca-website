import type pg from "pg";
import { APIError } from "payload";
import { accessPool, workspaceTable } from "../delegatedAccess.ts";
import {
  withCommitteeMode,
  committeeAccessEnabled,
} from "../committeeEnvironment.ts";
import {
  approvedAccount,
  mayManageCommittee,
  type CommitteeAccount,
  type CommitteeMembership,
} from "../committeePolicy.ts";
import { loadWorkspaceCatalog } from "./repository.ts";
import { withWorkspaceAuthority } from "./policyContext.ts";
import type { AccessGraphSnapshot, PolicyWorkspace } from "./types.ts";
export type AccountRow = {
  id: string | number;
  email: string;
  role: string;
  status: string;
  display_name?: string;
  committee_memberships: CommitteeMembership[];
  committee_access_revision: string;
  committee_access_reviewed_at: string | null;
  committee_access_reviewed_by?: string;
};
export function rowAuthority(
  r: AccountRow,
  catalog: PolicyWorkspace[],
): CommitteeAccount {
  return withWorkspaceAuthority(
    withCommitteeMode({
      ...r,
      committeeMemberships: r.committee_memberships ?? [],
      committeeAccessReviewedAt: r.committee_access_reviewed_at,
      committeeAccessReviewedBy: r.committee_access_reviewed_by,
    }),
    catalog,
  );
}
export async function currentActor(
  client: pg.PoolClient,
  actor: CommitteeAccount,
  catalog: PolicyWorkspace[],
  lock = "FOR SHARE",
) {
  const { rows } = await client.query(
    `SELECT * FROM ${workspaceTable("users")} WHERE id::text=$1 ${lock}`,
    [String(actor.id)],
  );
  const current = rows[0] ? rowAuthority(rows[0], catalog) : null;
  if (!approvedAccount(current))
    throw new APIError("Your access has changed. Sign in again.", 403);
  return current;
}
export async function accessSnapshot(
  actor: CommitteeAccount,
  client?: pg.PoolClient,
): Promise<AccessGraphSnapshot> {
  const c = client ?? (await accessPool().connect());
  try {
    if (!client) await c.query("BEGIN");
    const catalog = await loadWorkspaceCatalog(c),
      current = await currentActor(c, actor, catalog);
    const platform = current.role === "administrator";
    const visible = catalog.filter(
      (w) => platform || mayManageCommittee(current, w.id),
    );
    if (!platform && !visible.length)
      throw new APIError(
        "Only workspace access managers can open this overview.",
        403,
      );
    const scopes = visible.map((w) => w.id);
    const { rows } = await c.query(
      `SELECT id,email,display_name,status,committee_memberships,committee_access_revision FROM ${workspaceTable("users")} WHERE $1::boolean OR EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(committee_memberships,'[]')) m WHERE m->>'committee'=ANY($2::text[])) ORDER BY email`,
      [platform, scopes],
    );
    const people = rows.map((r) => ({
      id: String(r.id),
      email: r.email,
      name: r.display_name || r.email.split("@")[0],
      status: r.status,
      revision: r.committee_access_revision ?? "",
      photoURL: `/api/account/photo?id=${r.id}`,
    }));
    const memberships = rows.flatMap((r) =>
      (r.committee_memberships ?? [])
        .filter((m: CommitteeMembership) => scopes.includes(m.committee))
        .map((m: CommitteeMembership) => ({ ...m, userId: String(r.id) })),
    );
    const snapshot: AccessGraphSnapshot = {
      mode: committeeAccessEnabled() ? "active" : "staged",
      viewer: {
        id: String(current.id),
        create: platform && committeeAccessEnabled(),
        configure: platform && committeeAccessEnabled(),
        appoint: platform && committeeAccessEnabled(),
      },
      workspaces: visible,
      people,
      memberships,
      revision: [
        ...visible.map((w) => w.revision),
        ...people.map((p) => p.revision),
      ].join(":"),
    };
    if (!client) await c.query("COMMIT");
    return snapshot;
  } catch (e) {
    if (!client) await c.query("ROLLBACK");
    throw e;
  } finally {
    if (!client) c.release();
  }
}
