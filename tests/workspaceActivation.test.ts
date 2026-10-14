import { it, expect } from "vitest";
import { workspaceActivationIssues } from "../features/access/workspaces/activation";
import { activationIssues } from "../features/access/committeeMigration";
it("blocks unknown or missing record ownership before enabling workspaces", () => {
  expect(
    workspaceActivationIssues(
      [{ id: "National", status: "active", areas: ["events"] }],
      ["National", null, "unknown"],
    ),
  ).toHaveLength(2);
  expect(
    workspaceActivationIssues(
      [{ id: "ws-masa", status: "archived", areas: ["events"] }],
      ["ws-masa"],
    ),
  ).toEqual([]);
});
it("requires MASCA identities and explicit dates, including on projects", () => {
  expect(
    activationIssues([
      {
        id: "1",
        email: "outside@gmail.com",
        role: "editor",
        status: "active",
        committeeAccessReviewedAt: "2026-01-01",
        committeeMemberships: [],
      },
    ]),
  ).toHaveLength(1);
});
