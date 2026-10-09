/** Pure policy foundation; wire into every server entrypoint before enabling SSO. */
export const workspaceDomain = "masca.org.au";
export const contentAreas = [
  "events",
  "careers",
  "committee",
  "sponsors",
] as const;
export const ownershipScopes = [
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
export type ContentArea = (typeof contentAreas)[number];
export type OwnershipScope = (typeof ownershipScopes)[number];
export const permissionAreas = [...contentAreas, "organisations", "media"] as const;
export type PermissionArea = (typeof permissionAreas)[number];
export type SectionPermission = { view: boolean; edit: boolean; scopes: OwnershipScope[] };
export type ContentPermissions = Partial<Record<PermissionArea, SectionPermission>>;
export type AccessGrant = { area: ContentArea; scope: OwnershipScope };
export type ApprovedAccount = {
  email: string;
  status: "invited" | "active" | "suspended";
  role: "administrator" | "editor";
  grants: AccessGrant[];
  permissions?: ContentPermissions | null;
  allContentAccess?: boolean | null;
  googleSubject?: string | null;
  calendarAccess?: import("../mediaCalendar/types").CalendarAccess | null;
};
export function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}
export function isWorkspaceEmail(email: string) {
  return /^[^\s@]+@masca\.org\.au$/.test(normalizedEmail(email));
}
export function mayManage(
  account: ApprovedAccount | null | undefined,
  area: ContentArea,
  scope: OwnershipScope,
) {
  if (
    !account ||
    account.status !== "active" ||
    !isWorkspaceEmail(account.email)
  )
    return false;
  return (
    account.role === "administrator" ||
    account.allContentAccess === true ||
    (account.permissions != null
      ? account.permissions[area]?.edit === true && account.permissions[area]?.view === true && account.permissions[area]?.scopes?.includes(scope) === true
      : (account.grants ?? []).some((grant) => grant.area === area && grant.scope === scope))
  );
}
export function mayManagePeople(account: ApprovedAccount | null | undefined) {
  return (
    !!account &&
    account.status === "active" &&
    account.role === "administrator" &&
    isWorkspaceEmail(account.email)
  );
}
/** Call only AFTER OIDC signature, issuer, audience, expiry and nonce verification. */
export function approvedGoogleIdentity(
  account: ApprovedAccount | null | undefined,
  claims: {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    hd?: string;
  },
) {
  if (!account || !["invited", "active"].includes(account.status)) return false;
  if (
    !claims.sub ||
    !claims.email ||
    claims.email_verified !== true ||
    claims.hd !== workspaceDomain
  )
    return false;
  if (
    !isWorkspaceEmail(claims.email) ||
    normalizedEmail(account.email) !== normalizedEmail(claims.email)
  )
    return false;
  return !account.googleSubject || account.googleSubject === claims.sub;
}

export function mayManageSharedContent(
  account: ApprovedAccount | null | undefined,
) {
  return (
    !!account &&
    account.status === "active" &&
    isWorkspaceEmail(account.email) &&
    (account.role === "administrator" || account.allContentAccess === true)
  );
}

export function permissionsFor(account?: Pick<ApprovedAccount, "permissions" | "grants"> | null): ContentPermissions {
  if (account?.permissions != null) return account.permissions;
  return Object.fromEntries(permissionAreas.map(area => [area, {
    view: true,
    edit: (account?.grants ?? []).some(g => g.area === area),
    scopes: (account?.grants ?? []).filter(g => g.area === area).map(g => g.scope),
  }]));
}
export function mayView(account: ApprovedAccount | null | undefined, area: PermissionArea) {
  return !!account && account.status === "active" && isWorkspaceEmail(account.email) &&
    (mayManageSharedContent(account) || permissionsFor(account)[area]?.view === true);
}
export function mayEditArea(account: ApprovedAccount | null | undefined, area: PermissionArea) {
  if (!mayView(account, area)) return false;
  if (mayManageSharedContent(account)) return true;
  if (area === "media" || area === "organisations") return account?.permissions?.[area]?.edit === true;
  return ownershipScopes.some(scope => mayManage(account, area, scope));
}
export function validPermissions(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([area, p]) => permissionAreas.includes(area as PermissionArea) &&
    p && typeof p === "object" && typeof p.view === "boolean" && typeof p.edit === "boolean" &&
    (!p.edit || p.view) && Array.isArray(p.scopes) && p.scopes.every((scope: OwnershipScope) => ownershipScopes.includes(scope)) &&
    (!p.edit || !contentAreas.includes(area as ContentArea) || p.scopes.length > 0));
}
