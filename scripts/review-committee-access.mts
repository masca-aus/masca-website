import { workspaceOwnershipReport } from "../features/access/workspaces/activation.ts";
import { withWorkspaceAuthority } from "../features/access/workspaces/policyContext.ts";
import pg from "pg";
import { workspaceSchema } from "../features/access/workspaceEnvironment.ts";
import {
  legacyMembershipProposal,
  activationIssues,
} from "../features/access/committeeMigration.ts";
const c = new pg.Client({
  connectionString: process.env.DATABASE_URI,
  connectionTimeoutMillis: 10000,
});
try {
  await c.connect();
  await c.query("BEGIN READ ONLY");
  const schema = workspaceSchema();
  const { rows } = await c.query(
    `SELECT u.id,u.email,u.role,u.status,u.permissions,u.all_content_access,u.calendar_access,u.committee_memberships,u.committee_access_reviewed_at,COALESCE((SELECT jsonb_agg(jsonb_build_object('area',g.area,'scope',g.scope)) FROM "${schema}".users_grants g WHERE g._parent_id=u.id),'[]') AS grants FROM "${schema}".users u ORDER BY u.id`,
  );
  const report = await workspaceOwnershipReport(c);
  const accounts = rows.map((r) =>
    withWorkspaceAuthority(
      {
        ...r,
        allContentAccess: r.all_content_access,
        calendarAccess: r.calendar_access,
        committeeMemberships: r.committee_memberships,
        committeeAccessReviewedAt: r.committee_access_reviewed_at,
      },
      report.catalog,
    ),
  );
  if (process.argv.includes("--check")) {
    const issues = activationIssues(accounts);
    if (report.issues.length)
      issues.push({ userId: "system", email: "", issues: report.issues });
    if (!process.env.CRON_SECRET)
      issues.push({
        userId: "system",
        email: "",
        issues: [
          "Configure CRON_SECRET for protected handover reminders before activation.",
        ],
      });
    console.log(
      JSON.stringify({ ready: issues.length === 0, issues }, null, 2),
    );
    if (issues.length) process.exitCode = 1;
  } else
    console.log(
      JSON.stringify(
        {
          proposals: accounts.map(legacyMembershipProposal),
          activationIssues: activationIssues(accounts),
          ownershipIssues: report.issues,
        },
        null,
        2,
      ),
    );
  await c.query("ROLLBACK");
} finally {
  await c.end();
}
