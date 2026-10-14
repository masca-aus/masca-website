import type pg from "pg";
import type { PolicyWorkspace } from "./types.ts";
import { workspaceSchema } from "../workspaceEnvironment.ts";
import { calendarSchema } from "../../mediaCalendar/schema.ts";
export function workspaceActivationIssues(
  catalog: PolicyWorkspace[],
  owners: unknown[],
): string[] {
  const known = new Set(catalog.map((w) => w.id));
  return [
    ...new Set(
      owners
        .filter((id) => typeof id !== "string" || !known.has(id))
        .map((id) =>
          id == null
            ? "Working records have missing workspace ownership."
            : `Unknown workspace owner: ${String(id)}.`,
        ),
    ),
  ];
}
export async function workspaceOwnershipReport(c: Pick<pg.Client, "query">) {
  const schema = workspaceSchema(),
    calendar = calendarSchema(),
    issues: string[] = [],
    owners: unknown[] = [];
  if (
    !(
      await c.query("SELECT to_regclass($1) AS relation", [
        `"${schema}".access_workspaces`,
      ])
    ).rows[0].relation
  )
    return {
      catalog: [] as PolicyWorkspace[],
      issues: ["Run the workspace catalogue migration before activation."],
    };
  const catalog = (
    await c.query(`SELECT id,status,areas FROM "${schema}".access_workspaces`)
  ).rows as PolicyWorkspace[];
  for (const tab of [
    "events",
    "careers",
    "committee",
    "sponsors",
    "organisations",
    "media",
    "_events_v",
    "_careers_v",
    "_committee_v",
    "_sponsors_v",
    "_organisations_v",
    "_media_v",
  ]) {
    const column = tab.startsWith("_")
      ? "version_owning_scope"
      : "owning_scope";
    const exists = (
      await c.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=$3",
        [schema, tab, column],
      )
    ).rowCount;
    if (exists)
      owners.push(
        ...(
          await c.query(
            `SELECT DISTINCT "${column}" AS owner FROM "${schema}"."${tab}"`,
          )
        ).rows.map((r) => r.owner),
      );
  }
  for (const tab of ["posts", "categories", "revisions"])
    if (
      (
        await c.query("SELECT to_regclass($1) AS relation", [
          `"${calendar}".${tab}`,
        ])
      ).rows[0].relation
    )
      owners.push(
        ...(
          await c.query(
            `SELECT DISTINCT data->>'owningScope' AS owner FROM "${calendar}".${tab}`,
          )
        ).rows.map((r) => r.owner),
      );
  issues.push(...workspaceActivationIssues(catalog, owners));
  return { catalog, issues };
}
