import type { PolicyWorkspace, WorkspaceId } from "./workspaces/types.ts";
/** Shared, fail-closed authority for committee work. No browser value grants access. */
export const committeeScopes = [
  "National",
  "QLD",
  "NSW",
  "VIC",
  "ACT",
  "SA",
  "WA",
  "TAS",
  "NT",
] as const;
export type CommitteeScope = WorkspaceId;
export const committeeAreas = [
  "events",
  "careers",
  "committee",
  "sponsors",
  "organisations",
  "media",
  "mediaCalendar",
] as const;
export type CommitteeArea = (typeof committeeAreas)[number];
export const committeeRoles = ["viewer", "editor", "approver"] as const;
export type CommitteeRole = (typeof committeeRoles)[number];
export type CommitteeMembership = {
  id: string;
  committee: CommitteeScope;
  roles: Partial<Record<CommitteeArea, CommitteeRole[]>>;
  expiresAt: string;
  manager: boolean;
};
export type SharingGrant = { userId: string; role: "viewer" | "editor" };
export type CommitteeAccount = {
  id?: string | number;
  email: string;
  status: string;
  role: string;
  accessModel?: "legacy" | "committee";
  accessCatalog?: PolicyWorkspace[];
  committeeAccessReviewedAt?: string | null;
  committeeAccessReviewedBy?: string | null;
  committeeMemberships?: CommitteeMembership[] | null;
};
export type CommitteeResource = {
  area: CommitteeArea;
  owningScope: CommitteeScope;
  creator?: string;
  contributors?: string[];
  sharedWith?: SharingGrant[] | null;
};
export type CommitteeAction =
  | "view"
  | "comment"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "publish"
  | "share";
const known = <T extends string>(
  values: readonly T[],
  value: unknown,
): value is T => typeof value === "string" && values.includes(value as T);
export function committeeMode(account: CommitteeAccount | null | undefined) {
  return account?.accessModel === "committee";
}
export function approvedAccount(
  account: CommitteeAccount | null | undefined,
): account is CommitteeAccount {
  return (
    !!account &&
    account.status === "active" &&
    (!committeeMode(account) || !!account.committeeAccessReviewedAt) &&
    /^[^\s@]+@masca\.org\.au$/.test(account.email.trim().toLowerCase())
  );
}
export function validMemberships(
  value: unknown,
  catalog?: PolicyWorkspace[],
): value is CommitteeMembership[] {
  if (!Array.isArray(value) || value.length > 100) return false;
  const scopes = new Set(),
    ids = new Set();
  return value.every((m) => {
    if (
      !m ||
      typeof m !== "object" ||
      Object.keys(m).some(
        (k) =>
          !["id", "committee", "roles", "expiresAt", "manager"].includes(k),
      ) ||
      typeof m.id !== "string" ||
      !m.id ||
      m.id.length > 100 ||
      ids.has(m.id) ||
      !knownWorkspace(m.committee, catalog) ||
      scopes.has(m.committee) ||
      typeof m.manager !== "boolean" ||
      typeof m.expiresAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T/.test(m.expiresAt) ||
      !Number.isFinite(Date.parse(m.expiresAt)) ||
      !m.roles ||
      typeof m.roles !== "object" ||
      Array.isArray(m.roles)
    )
      return false;
    ids.add(m.id);
    scopes.add(m.committee);
    return Object.entries(m.roles).every(
      ([area, roles]) =>
        known(committeeAreas, area) &&
        Array.isArray(roles) &&
        (!catalog ||
          !roles.length ||
          catalog
            .find((w) => w.id === m.committee)
            ?.areas.includes(area as CommitteeArea)) &&
        roles.every((r) => known(committeeRoles, r)) &&
        new Set(roles).size === roles.length,
    );
  });
}
export function validSharing(value: unknown): value is SharingGrant[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    new Set(value.map((v) => v?.userId)).size === value.length &&
    value.every(
      (v) =>
        v &&
        typeof v.userId === "string" &&
        v.userId.length > 0 &&
        v.userId.length <= 100 &&
        ["viewer", "editor"].includes(v.role) &&
        Object.keys(v).every((k) => ["userId", "role"].includes(k)),
    )
  );
}
export function activeMemberships(
  account: CommitteeAccount | null | undefined,
  now = Date.now(),
): CommitteeMembership[] {
  return approvedAccount(account) &&
    validMemberships(account.committeeMemberships, account.accessCatalog)
    ? account.committeeMemberships.filter(
        (m) =>
          Date.parse(m.expiresAt) > now &&
          activeWorkspace(m.committee, account.accessCatalog),
      )
    : [];
}
export function rolesFor(
  account: CommitteeAccount | null | undefined,
  committee: CommitteeScope,
  area: CommitteeArea,
  now = Date.now(),
): CommitteeRole[] {
  if (!activeWorkspace(committee, account?.accessCatalog, area)) return [];
  return (
    activeMemberships(account, now).find((m) => m.committee === committee)
      ?.roles[area] ?? []
  );
}
export function mayAccessResource(
  account: CommitteeAccount | null | undefined,
  resource: CommitteeResource,
  action: CommitteeAction,
  now = Date.now(),
): boolean {
  if (
    !approvedAccount(account) ||
    !activeWorkspace(
      resource.owningScope,
      account.accessCatalog,
      resource.area,
    ) ||
    !known(committeeAreas, resource.area)
  )
    return false;
  const roles = rolesFor(account, resource.owningScope, resource.area, now);
  const independent =
    String(account.id) !== resource.creator &&
    !resource.contributors?.includes(String(account.id));
  if (action === "approve" || action === "publish")
    return roles.includes("approver") && independent;
  if (action === "create" || action === "delete")
    return roles.includes("editor");
  if (action === "share")
    return roles.includes("editor") || roles.includes("approver");
  if (action === "edit" && roles.includes("editor")) return true;
  if ((action === "view" || action === "comment") && roles.length > 0)
    return true;
  const share = validSharing(resource.sharedWith)
    ? resource.sharedWith.find((g) => g.userId === String(account.id))
    : null;
  return (
    activeMemberships(account, now).length > 0 &&
    !!share &&
    (["view", "comment"].includes(action) ||
      (action === "edit" && share.role === "editor"))
  );
}
export function accessibleCommittees(
  account: CommitteeAccount | null | undefined,
  area?: CommitteeArea,
  action: CommitteeAction = "view",
  now = Date.now(),
): CommitteeScope[] {
  return activeMemberships(account, now)
    .filter((m) =>
      area
        ? mayAccessResource(
            account,
            { area, owningScope: m.committee },
            action,
            now,
          )
        : m.manager || Object.values(m.roles).some((r) => !!r?.length),
    )
    .map((m) => m.committee);
}
export function mayManageCommittee(
  account: CommitteeAccount | null | undefined,
  committee: CommitteeScope,
  now = Date.now(),
): boolean {
  return (
    approvedAccount(account) &&
    activeWorkspace(committee, account.accessCatalog) &&
    (account.role === "administrator" ||
      activeMemberships(account, now).some(
        (m) => m.committee === committee && m.manager,
      ))
  );
}
/** Removing roles never renews or widens an existing membership. */
export function isSubtractiveMembershipChange(
  before: CommitteeMembership | undefined,
  next: CommitteeMembership,
): boolean {
  return (
    !!before &&
    before.id === next.id &&
    before.committee === next.committee &&
    before.manager === next.manager &&
    before.expiresAt === next.expiresAt &&
    Object.entries(next.roles).every(([area, roles]) =>
      (roles ?? []).every((role) =>
        before.roles[area as CommitteeArea]?.includes(role),
      ),
    )
  );
}

export function mayDelegateMemberships(
  actor: CommitteeAccount,
  before: CommitteeMembership[],
  next: CommitteeMembership[],
  targetId: string,
  now = Date.now(),
): boolean {
  if (
    !approvedAccount(actor) ||
    !validMemberships(before, actor.accessCatalog) ||
    !validMemberships(next, actor.accessCatalog)
  )
    return false;
  if (actor.role === "administrator") return true;
  if (String(actor.id) === targetId) return false;
  for (const scope of new Set([...before, ...next].map((m) => m.committee))) {
    const old = before.find((m) => m.committee === scope),
      updated = next.find((m) => m.committee === scope);
    if (JSON.stringify(old) === JSON.stringify(updated)) continue;
    const manager = activeMemberships(actor, now).find(
      (m) => m.committee === scope && m.manager,
    );
    if (!manager || old?.manager || updated?.manager) return false;
    if (
      updated &&
      !isSubtractiveMembershipChange(old, updated) &&
      (Date.parse(updated.expiresAt) <= now ||
        Date.parse(updated.expiresAt) > Date.parse(manager.expiresAt))
    )
      return false;
  }
  return true;
}

/** Without a catalogue, only legacy IDs can be interpreted; custom IDs fail closed. */
export function knownWorkspace(
  id: unknown,
  catalog?: PolicyWorkspace[],
): id is string {
  return (
    typeof id === "string" &&
    (catalog ? catalog.some((w) => w.id === id) : known(committeeScopes, id))
  );
}
export function activeWorkspace(
  id: unknown,
  catalog?: PolicyWorkspace[],
  area?: CommitteeArea,
): boolean {
  if (!knownWorkspace(id, catalog)) return false;
  if (!catalog) return true;
  const w = catalog.find((w) => w.id === id);
  return w?.status === "active" && (!area || w.areas.includes(area));
}
