import { committeeAccessEnabled } from "../committeeEnvironment.ts";
import { APIError } from "payload";
import { accessPool, workspaceTable } from "../delegatedAccess.ts";
import { workspaceSchema } from "../workspaceEnvironment.ts";
import { calendarSchema } from "../../mediaCalendar/schema.ts";
import {
  activeMemberships,
  mayAccessResource,
  mayManageCommittee,
  rolesFor,
  validSharing,
  type CommitteeAccount,
  type CommitteeArea,
  type SharingGrant,
} from "../committeePolicy.ts";
import { loadWorkspaceCatalog } from "./repository.ts";
import { currentActor } from "./graph.ts";
import { memberAreaLabels } from "../memberPresentation.ts";
export type SharedAccessRecord = {
  recordId: string;
  area: CommitteeArea;
  label: string;
  sharedWith: { userId: string; name: string; role: "viewer" | "editor" }[];
  canManage: boolean;
  href?: string;
};
export async function sharedAccessRecords(
  actor: CommitteeAccount,
  workspaceId: string,
): Promise<SharedAccessRecord[]> {
  if (!committeeAccessEnabled())
    throw new APIError(
      "Record sharing requires the completed workspace rollout.",
      403,
    );
  if (!workspaceId || workspaceId.length > 100)
    throw new APIError("Choose a workspace.", 400);
  const c = await accessPool().connect();
  try {
    await c.query("BEGIN");
    const catalog = await loadWorkspaceCatalog(c),
      current = await currentActor(c, actor, catalog),
      workspace = catalog.find((w) => w.id === workspaceId);
    if (
      !workspace ||
      (current.role !== "administrator" &&
        !mayManageCommittee(current, workspaceId))
    )
      throw new APIError("You cannot inspect this sharing overview.", 403);
    const records: SharedAccessRecord[] = [];
    const active = workspace.status === "active",
      sharedEligible = activeMemberships(current).length > 0;
    for (const area of workspace.areas) {
      if (records.length >= 100) break;
      const calendar = area === "mediaCalendar";
      const table = calendar
        ? `"${calendarSchema()}".posts`
        : workspaceTable(area);
      if (
        !(await c.query("SELECT to_regclass($1) AS relation", [table])).rows[0]
          .relation
      )
        continue;
      const base = calendar
        ? {
            owner: "data->>'owningScope'",
            title: "data->>'title'",
            grants: "data->'sharedWith'",
            creator: "data->>'creator'",
            contributors: "data->'contributors'",
          }
        : {
            owner: "owning_scope",
            title:
              area === "events" || area === "careers"
                ? "title"
                : area === "media"
                  ? "alt"
                  : "name",
            grants: "shared_with",
            creator: "access_creator",
            contributors: "access_contributors",
          };
      const owned = active && rolesFor(current, workspaceId, area).length > 0;
      const { rows } = await c.query(
        `SELECT id,${base.creator} AS creator,${base.contributors} AS contributors,${base.grants} AS grants,CASE WHEN $2::boolean OR ($3::boolean AND ${base.grants} @> $4::jsonb) THEN ${base.title} ELSE NULL END AS title FROM ${table} WHERE ${base.owner}=$1 AND jsonb_typeof(${base.grants})='array' AND jsonb_array_length(${base.grants})>0 ${calendar ? "AND data->>'deletedAt' IS NULL" : ""} ORDER BY id LIMIT $5`,
        [
          workspaceId,
          owned,
          active && sharedEligible,
          JSON.stringify([{ userId: String(current.id) }]),
          100 - records.length,
        ],
      );
      for (const r of rows) {
        const grants: SharingGrant[] = validSharing(r.grants) ? r.grants : [];
        if (!grants.length) continue;
        const resource = {
          area,
          owningScope: workspaceId,
          creator: r.creator,
          contributors: r.contributors ?? [],
          sharedWith: grants,
        };
        const canView = mayAccessResource(current, resource, "view"),
          canManage = mayAccessResource(current, resource, "share");
        const { rows: people } = await c.query(
          `SELECT id,COALESCE(display_name,split_part(email,'@',1)) AS name FROM "${workspaceSchema()}".users WHERE id::text=ANY($1::text[])`,
          [grants.map((g) => g.userId)],
        );
        records.push({
          recordId: String(r.id),
          area,
          label:
            canView && r.title
              ? r.title
              : `${memberAreaLabels[area]} record #${r.id}`,
          sharedWith: grants.map((g) => ({
            ...g,
            name:
              people.find((p) => String(p.id) === g.userId)?.name ??
              "Former member",
          })),
          canManage,
          ...(canView
            ? {
                href: calendar
                  ? `/admin/media-calendar?post=${encodeURIComponent(r.id)}`
                  : `/admin/collections/${area}/${encodeURIComponent(r.id)}`,
              }
            : {}),
        });
      }
    }
    await c.query("COMMIT");
    return records;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
