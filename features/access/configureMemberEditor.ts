import type { CollectionConfig, Field } from "payload";
/** Visual layout only: collapsible fields keep the existing root data paths. */
export function configureMemberEditor(
  collection: CollectionConfig,
): CollectionConfig {
  const byName = new Map(
    collection.fields.flatMap((field) =>
      "name" in field ? [[field.name, field] as const] : [],
    ),
  );
  const taken = new Set<string>();
  function take(names: string[]): Field[] {
    return names.flatMap((name) => {
      const field = byName.get(name);
      if (!field) return [];
      taken.add(name);
      return [field];
    });
  }
  const identityFields = take(["email", "displayName"]);
  const email = identityFields[0];
  if (email)
    email.admin = {
      ...email.admin,
      placeholder: "name@masca.org.au",
      description:
        "Use an individual MASCA Google account. Shared inboxes should not be used for sign-in.",
    };
  const role = byName.get("role");
  if (role?.type === "select") role.label = "Account type";
  const status = byName.get("status");
  if (status?.type === "select") status.label = "Account status";
  return {
    ...collection,
    labels: { singular: "Member", plural: "People & access" },
    admin: {
      ...collection.admin,
      description: "Add members, assign committee access and manage handovers.",
      components: {
        ...collection.admin?.components,
        views: {
          ...collection.admin?.components?.views,
          edit: {
            default: {
              Component: "/components/admin/MemberEditor#MemberEditorView",
            },
          },
        },
        edit: {
          ...collection.admin?.components?.edit,
          SaveButton: "/components/admin/MemberEditor#MemberSaveControl",
        },
      },
    },
    fields: [
      ...take([
        "accessModel",
        "committeeAccessRevision",
        "googleSubject",
        "sessionRevision",
      ]),
      {
        name: "memberDetails",
        type: "ui",
        admin: {
          components: {
            Field: "/components/admin/MemberEditor#MemberEditorHeader",
          },
          disableBulkEdit: true,
          disableListColumn: true,
        },
      },
      ...identityFields,
      ...take(["committeeMemberships"]),
      {
        type: "collapsible",
        label: "Current access",
        admin: {
          initCollapsed: true,
          condition: (_data, _siblings, { user }) =>
            user?.accessModel !== "committee",
          className: "member-current-access",
        },
        fields: take([
          "calendarAccess",
          "allContentAccess",
          "permissions",
          "grants",
        ]),
      },
      {
        type: "collapsible",
        label: "Account settings",
        admin: { initCollapsed: true, className: "member-account-settings" },
        fields: take([
          "role",
          "status",
          "departments",
          "accountPhoto",
          "committeeAccessReviewedAt",
          "committeeAccessReviewedBy",
        ]),
      },
      {
        name: "memberAccessSummary",
        type: "ui",
        admin: {
          components: {
            Field: "/components/admin/MemberEditor#MemberAccessSummary",
          },
          disableBulkEdit: true,
          disableListColumn: true,
        },
      },
      ...collection.fields.filter(
        (field) => !("name" in field) || !taken.has(field.name),
      ),
    ],
  };
}
