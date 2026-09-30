import { describe, expect, it } from "vitest";
import {
  approvedGoogleIdentity,
  mayView, mayEditArea, validPermissions,
  contentAreas,
  ownershipScopes,
  mayManageSharedContent,
  mayManage,
  mayManagePeople,
  type ApprovedAccount,
} from "../features/access/workspacePolicy";
const editor: ApprovedAccount = {
  email: "editor@masca.org.au",
  status: "active",
  role: "editor",
  grants: [
    { area: "careers", scope: "QLD" },
    { area: "events", scope: "VIC" },
  ],
};
const claims = {
  sub: "google-123",
  email: editor.email,
  email_verified: true,
  hd: "masca.org.au",
};
describe("Workspace access boundaries", () => {
  it("keeps area/state grants paired instead of granting their cross product", () => {
    expect(mayManage(editor, "careers", "QLD")).toBe(true);
    expect(mayManage(editor, "events", "VIC")).toBe(true);
    expect(mayManage(editor, "events", "QLD")).toBe(false);
    expect(mayManage(editor, "careers", "VIC")).toBe(false);
    expect(mayManage(editor, "careers", "National")).toBe(false);
    expect(mayManagePeople(editor)).toBe(false);
  });
  it("denies inactive and unapproved accounts", () => {
    expect(mayManage(null, "careers", "QLD")).toBe(false);
    for (const status of ["suspended", "invited"] as const) {
      expect(mayManage({ ...editor, status }, "careers", "QLD")).toBe(false);
    }
    expect(approvedGoogleIdentity(null, claims)).toBe(false);
    expect(
      approvedGoogleIdentity({ ...editor, status: "suspended" }, claims),
    ).toBe(false);
  });
  it("requires exact approved identity and verified hosted domain", () => {
    expect(approvedGoogleIdentity(editor, claims)).toBe(true);
    expect(
      approvedGoogleIdentity({ ...editor, status: "invited" }, claims),
    ).toBe(true);
    expect(approvedGoogleIdentity(editor, { ...claims, hd: undefined })).toBe(
      false,
    );
    expect(
      approvedGoogleIdentity(editor, { ...claims, email_verified: false }),
    ).toBe(false);
    expect(
      approvedGoogleIdentity(editor, {
        ...claims,
        email: "someone@masca.org.au",
      }),
    ).toBe(false);
    expect(
      approvedGoogleIdentity(editor, { ...claims, hd: "other.org.au" }),
    ).toBe(false);
    expect(
      approvedGoogleIdentity({ ...editor, googleSubject: "different" }, claims),
    ).toBe(false);
  });
  it("allows active approved administrators, not suspended ones", () => {
    const admin = { ...editor, role: "administrator" as const };
    expect(mayManagePeople(admin)).toBe(true);
    expect(mayManage(admin, "sponsors", "National")).toBe(true);
    expect(mayManagePeople({ ...admin, status: "suspended" })).toBe(false);
  });
});

describe("All-content editor", () => {
  it("can manage every content area and state without managing people", () => {
    const account = { ...editor, allContentAccess: true };
    for (const area of contentAreas)
      for (const scope of ownershipScopes)
        expect(mayManage(account, area, scope)).toBe(true);
    expect(mayManageSharedContent(account)).toBe(true);
    expect(mayManagePeople(account)).toBe(false);
    expect(mayManageSharedContent(editor)).toBe(false);
    expect(
      mayManage({ ...account, status: "suspended" }, "careers", "QLD"),
    ).toBe(false);
    expect(mayManageSharedContent({ ...account, status: "suspended" })).toBe(
      false,
    );
  });
});

describe('Section viewing and editing', () => {
  it('preserves legacy editing scopes while allowing viewing across sections', () => {
    expect(mayView(editor, 'careers')).toBe(true);
    expect(mayView(editor, 'sponsors')).toBe(true);
    expect(mayEditArea(editor, 'careers')).toBe(true);
    expect(mayEditArea(editor, 'sponsors')).toBe(false);
  });
  it('enforces explicit read-only and hidden sections', () => {
    const user: ApprovedAccount = { ...editor, permissions: {
      careers: { view: true, edit: false, scopes: ['QLD'] },
      events: { view: false, edit: false, scopes: [] },
      media: { view: true, edit: true, scopes: [] },
    } };
    expect(mayView(user, 'careers')).toBe(true);
    expect(mayManage(user, 'careers', 'QLD')).toBe(false);
    expect(mayView(user, 'events')).toBe(false);
    expect(mayEditArea(user, 'media')).toBe(true);
    expect(mayManagePeople(user)).toBe(false);
    expect(mayView({ ...user, status: 'suspended' }, 'careers')).toBe(false);
  });
  it('requires the selected editing team and rejects malformed permissions', () => {
    const permissions = { careers: { view: true, edit: true, scopes: ['QLD' as const] } };
    expect(mayManage({ ...editor, permissions }, 'careers', 'QLD')).toBe(true);
    expect(mayManage({ ...editor, permissions }, 'careers', 'NSW')).toBe(false);
    expect(validPermissions(permissions)).toBe(true);
    expect(validPermissions({ careers: { view: false, edit: true, scopes: ['QLD'] } })).toBe(false);
    expect(validPermissions({ careers: { view: true, edit: true, scopes: [] } })).toBe(false);
    expect(validPermissions({ users: { view: true, edit: true, scopes: [] } })).toBe(false);
  });
});
