import { APIError } from "payload";
import { accessPool, workspaceTable } from "../delegatedAccess.ts";
import {
  mayManageCommittee,
  type CommitteeAccount,
} from "../committeePolicy.ts";
import { loadWorkspaceCatalog } from "./repository.ts";
import { currentActor } from "./graph.ts";
export async function accessHistory(
  actor: CommitteeAccount,
  workspaceId: string,
  targetId?: string,
) {
  if (
    !workspaceId ||
    workspaceId.length > 100 ||
    (targetId && targetId.length > 100)
  )
    throw new APIError("Choose a workspace and person.", 400);
  const c = await accessPool().connect();
  try {
    await c.query("BEGIN");
    const catalog = await loadWorkspaceCatalog(c),
      current = await currentActor(c, actor, catalog);
    if (
      !catalog.some((w) => w.id === workspaceId) ||
      (current.role !== "administrator" &&
        !mayManageCommittee(current, workspaceId))
    )
      throw new APIError("You cannot inspect this access history.", 403);
    const { rows } = await c.query(
      `SELECT a.id,a.action,a.created_at AS "createdAt",COALESCE(u.display_name,split_part(u.email,'@',1),'Former member') AS "actorName",a.before_data AS before,a.after_data AS after FROM ${workspaceTable("committee_access_audit")} a LEFT JOIN ${workspaceTable("users")} u ON u.id::text=a.actor_id WHERE a.committee=$1 AND ($2::text IS NULL OR a.target_id=$2) AND ($3::boolean OR a.action NOT IN('account-status-or-role','review-legacy-access','add-person')) ORDER BY a.created_at DESC LIMIT 50`,
      [workspaceId, targetId ?? null, current.role === "administrator"],
    );
    await c.query("COMMIT");
    return rows;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
