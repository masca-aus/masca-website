import {
  activeMemberships,
  approvedAccount,
  committeeScopes,
  type CommitteeAccount,
} from "./committeePolicy";
/** UI visibility only. The repository rechecks authority from locked database rows. */
export const managedCommittees = (
  actor: CommitteeAccount | null | undefined,
) =>
  approvedAccount(actor)
    ? actor.role === "administrator"
      ? [...committeeScopes]
      : activeMemberships(actor)
          .filter((m) => m.manager)
          .map((m) => m.committee)
    : [];
