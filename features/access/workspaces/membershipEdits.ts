import type {
  CommitteeMembership,
  CommitteeArea,
  CommitteeRole,
} from "../committeePolicy";
/** Only the chosen area changes. Renewal and workspace removal are explicit actions. */
export function assignArea(
  existing: CommitteeMembership,
  area: CommitteeArea,
  roles: CommitteeRole[],
): CommitteeMembership {
  return { ...existing, roles: { ...existing.roles, [area]: [...roles] } };
}
