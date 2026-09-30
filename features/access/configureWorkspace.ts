import { randomUUID } from "node:crypto";
import {
  APIError,
  type Access,
  type CollectionConfig,
  type Field,
  type Where,
} from "payload";
import {
  contentAreas,
  ownershipScopes,
  mayManage,
  mayManagePeople,
  isWorkspaceEmail,
  type ApprovedAccount,
  type ContentArea,
  type OwnershipScope,
} from "./workspacePolicy.ts";
import { signWorkspaceSession, workspaceStrategy } from "./workspaceSession.ts";
const accountOf = (user: unknown) => user as ApprovedAccount | null;
const admin: Access = ({ req }) => mayManagePeople(accountOf(req.user));
function scopeFilter(
  user: unknown,
  area: ContentArea,
  prefix = "",
): boolean | Where {
  const account = accountOf(user);
  if (mayManagePeople(account)) return true;
  if (!account || account.status !== "active") return false;
  const scopes = ownershipScopes.filter((scope) =>
    mayManage(account, area, scope),
  );
  return scopes.length ? { [`${prefix}owningScope`]: { in: scopes } } : false;
}
export function configureWorkspace(
  collections: CollectionConfig[],
): CollectionConfig[] {
  return collections.map((collection) => {
    if (collection.slug === "users")
      return {
        ...collection,
        labels: { singular: "Person", plural: "People & access" },
        admin: {
          ...collection.admin,
          hidden: ({ user }) => !mayManagePeople(accountOf(user)),
          defaultColumns: ["email", "role", "status"],
          description:
            "Approve a MASCA Workspace email, assign access, or suspend an account.",
        },
        auth: {
          disableLocalStrategy: true,
          strategies: [workspaceStrategy],
          useSessions: false,
        },
        access: {
          admin: ({ req }) =>
            !!req.user && accountOf(req.user)?.status === "active",
          create: admin,
          delete: () => false,
          read: ({ req }) =>
            mayManagePeople(accountOf(req.user))
              ? true
              : req.user
                ? { id: { equals: req.user.id } }
                : false,
          update: admin,
          unlock: () => false,
        },
        fields: [
          { name: "email", type: "email", required: true, unique: true },
          {
            name: "role",
            type: "select",
            required: true,
            defaultValue: "editor",
            options: [
              { label: "Administrator", value: "administrator" },
              { label: "Editor", value: "editor" },
            ],
          },
          {
            name: "status",
            type: "select",
            required: true,
            defaultValue: "invited",
            options: ["invited", "active", "suspended"],
          },
          {
            name: "grants",
            type: "array",
            label: "Department and state access",
            fields: [
              {
                name: "area",
                type: "select",
                required: true,
                options: [...contentAreas],
              },
              {
                name: "scope",
                type: "select",
                required: true,
                options: [...ownershipScopes],
              },
            ],
          },
          {
            name: "googleSubject",
            type: "text",
            unique: true,
            admin: { hidden: true },
            access: { create: () => false, update: () => false, read: admin },
          },
          {
            name: "sessionRevision",
            type: "text",
            admin: { hidden: true },
            access: {
              create: () => false,
              update: () => false,
              read: () => false,
            },
          },
        ] as Field[],
        hooks: {
          refresh: [
            async ({ args, user }) => {
              const current = await args.req.payload.findByID({
                collection: "users",
                id: args.req.user!.id,
                overrideAccess: true,
                depth: 0,
              });
              const revision = (
                current as unknown as { sessionRevision: string }
              ).sessionRevision;
              if (
                (current as unknown as ApprovedAccount).status !== "active" ||
                revision !==
                  (args.req.user as unknown as { sessionRevision: string })
                    .sessionRevision
              )
                throw new APIError("Please sign in again.", 401);
              return {
                user,
                refreshedToken: await signWorkspaceSession(
                  Number(current.id),
                  revision,
                  args.req.payload.secret,
                ),
                exp: Math.floor(Date.now() / 1000) + 28800,
                setCookie: true,
              };
            },
          ],
          beforeChange: [
            ({ data, originalDoc, req, context }) => {
              if (!isWorkspaceEmail(data.email ?? originalDoc?.email ?? ""))
                throw new APIError("Use an exact @masca.org.au email.", 400);
              data.email = (data.email ?? originalDoc?.email)
                .trim()
                .toLowerCase();
              if (originalDoc?.id != null && data.email !== originalDoc.email)
                throw new APIError(
                  "Create a new invitation to change an approved email.",
                  400,
                );
              // Administrators cannot suspend/demote themselves; deletion is disabled.
              if (
                req.user?.id != null && req.user.id === originalDoc?.id &&
                ((data.role && data.role !== "administrator") ||
                  (data.status && data.status !== "active"))
              )
                throw new APIError(
                  "Another administrator must change your access.",
                  400,
                );
              if (
                originalDoc?.email === process.env.WORKSPACE_BOOTSTRAP_EMAIL &&
                ((data.role && data.role !== "administrator") ||
                  (data.status && data.status !== "active"))
              )
                throw new APIError(
                  "The recovery administrator must remain active.",
                  400,
                );
              if (!context.workspaceLogin) data.sessionRevision = randomUUID();
              return data;
            },
          ],
        },
      };
    if (contentAreas.includes(collection.slug as ContentArea)) {
      const area = collection.slug as ContentArea;
      const read = collection.access?.read;
      const scoped: Access = ({ req }) => scopeFilter(req.user, area);
      const create: Access = ({ req }) => scopeFilter(req.user, area) !== false;
      return {
        ...collection,
        access: {
          ...collection.access,
          read: (args) =>
            args.req.user ? scoped(args) : read ? read(args) : true,
          create,
          update: scoped,
          delete: scoped,
          readVersions: ({ req }) => scopeFilter(req.user, area, "version."),
          unlock: scoped,
        },
        fields: [
          {
            name: "owningScope",
            label: "Managed by",
            type: "select",
            required: true,
            defaultValue: ({ user }) =>
              mayManagePeople(accountOf(user))
                ? "National"
                : accountOf(user)?.grants?.find((grant) => grant.area === area)
                    ?.scope,
            options: [...ownershipScopes],
            admin: {
              position: "sidebar",
              description:
                "The team responsible for this record. Independent of the public event/job location.",
            },
          },
          ...collection.fields,
        ],
        hooks: {
          ...collection.hooks,
          beforeChange: [
            ...(collection.hooks?.beforeChange ?? []),
            ({ data, originalDoc, req }) => {
              if (
                !mayManage(
                  accountOf(req.user),
                  area,
                  (data.owningScope ??
                    originalDoc?.owningScope) as OwnershipScope,
                )
              )
                throw new APIError(
                  "You cannot manage content for this team.",
                  403,
                );
              return data;
            },
          ],
        },
      };
    }
    if (["event-lifecycle", "career-lifecycle"].includes(collection.slug)) {
      const area = collection.slug === "event-lifecycle" ? "events" : "careers";
      const prefix = area === "events" ? "event." : "career.";
      return {
        ...collection,
        access: {
          ...collection.access,
          read: ({ req }) => scopeFilter(req.user, area, prefix),
          readVersions: ({ req }) =>
            scopeFilter(req.user, area, `version.${prefix}`),
        },
      };
    }
    // Shared resources are readable but only administrators can mutate them.
    return {
      ...collection,
      access: {
        ...collection.access,
        create: admin,
        update: admin,
        delete: admin,
        readVersions: admin,
      },
    };
  });
}
