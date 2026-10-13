import {
  activeMemberships,
  approvedAccount,
  committeeAreas,
  committeeScopes,
  validMemberships,
  type CommitteeAccount,
  type CommitteeMembership,
  type CommitteeRole,
  type CommitteeScope,
  type CommitteeArea,
} from "./committeePolicy.ts";
import type { ApprovedAccount } from "./workspacePolicy.ts";
export type MigrationProposal = {
  committee: CommitteeScope;
  roles: CommitteeMembership["roles"];
  manager: false;
  expiresAt: null;
};
export function legacyMembershipProposal(account: ApprovedAccount) {
  const proposals = new Map<CommitteeScope, MigrationProposal>(),
    reviewReasons: string[] = [];
  const grant = (
    committee: CommitteeScope,
    area: (typeof committeeAreas)[number],
    role: CommitteeRole,
  ) => {
    const m = proposals.get(committee) ?? {
      committee,
      roles: {},
      manager: false,
      expiresAt: null,
    };
    const old = m.roles[area] ?? [];
    m.roles[area] =
      role === "editor"
        ? [...old.filter((r) => r !== "viewer"), "editor"]
        : Array.from(new Set([...old, role]));
    proposals.set(committee, m);
  };
  if (account.role === "administrator")
    reviewReasons.push(
      "Platform administrator had broad legacy content access.",
    );
  if (account.allContentAccess)
    reviewReasons.push(
      "Edit all content requires explicit committee and area review.",
    );
  if (account.permissions) {
    for (const [area, p] of Object.entries(account.permissions)) {
      if (!committeeAreas.includes(area as CommitteeArea) || !p) continue;
      if (p.view && !p.scopes?.length)
        reviewReasons.push(
          `${area}: broad viewing access needs committee assignment.`,
        );
      for (const committee of p.scopes ?? [])
        if (committeeScopes.includes(committee))
          grant(committee, area as CommitteeArea, p.edit ? "editor" : "viewer");
    }
  } else for (const g of account.grants ?? []) grant(g.scope, g.area, "editor");
  if (account.calendarAccess?.view) {
    grant(
      "National",
      "mediaCalendar",
      account.calendarAccess.edit ? "editor" : "viewer",
    );
    if (account.calendarAccess.approve && account.calendarAccess.designation)
      grant("National", "mediaCalendar", "approver");
  }
  if (proposals.size)
    reviewReasons.push("Actual committee term end dates must be supplied.");
  return {
    userId: String(account.id ?? ""),
    email: account.email,
    memberships: [...proposals.values()],
    reviewReasons,
  };
}
export function activationIssues(
  accounts: (CommitteeAccount & {
    committeeAccessReviewedAt?: string | null;
  })[],
) {
  return accounts
    .filter((a) => ["active", "invited"].includes(a.status))
    .flatMap((a) => {
      const issues: string[] = [];
      if (!a.committeeAccessReviewedAt)
        issues.push("Legacy access has not been reviewed.");
      if (!validMemberships(a.committeeMemberships))
        issues.push(
          "Memberships need valid committee roles and actual term dates.",
        );
      return issues.length
        ? [{ userId: String(a.id), email: a.email, issues }]
        : [];
    });
}
export type TermReminder = {
  recipient: string;
  membershipId: string;
  memberId: string;
  committee: CommitteeScope;
  expiresAt: string;
  daysBefore: 30 | 7;
};
export function remindersDue(
  accounts: CommitteeAccount[],
  now = Date.now(),
): TermReminder[] {
  const out: TermReminder[] = [];
  for (const member of accounts.filter(approvedAccount))
    for (const membership of activeMemberships(member, now)) {
      const days =
        Math.floor(Date.parse(membership.expiresAt) / 86400000) -
        Math.floor(now / 86400000);
      if (days !== 30 && days !== 7) continue;
      for (const manager of accounts.filter(approvedAccount))
        if (
          manager.role === "administrator" ||
          activeMemberships(manager, now).some(
            (m) => m.committee === membership.committee && m.manager,
          )
        )
          out.push({
            recipient: String(manager.id),
            membershipId: membership.id,
            memberId: String(member.id),
            committee: membership.committee,
            expiresAt: membership.expiresAt,
            daysBefore: days,
          });
    }
  return out;
}
