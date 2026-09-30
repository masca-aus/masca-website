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
export type AccessGrant = { area: ContentArea; scope: OwnershipScope };
export type ApprovedAccount = {
  email: string;
  status: "invited" | "active" | "suspended";
  role: "administrator" | "editor";
  grants: AccessGrant[];
  allContentAccess?: boolean | null;
  googleSubject?: string | null;
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
    (account.grants ?? []).some(
      (grant) => grant.area === area && grant.scope === scope,
    )
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
