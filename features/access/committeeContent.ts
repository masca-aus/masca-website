import { rowAuthority } from "./workspaces/graph.ts";
import type { PolicyWorkspace } from "./workspaces/types.ts";
import { createHash } from "node:crypto";
import {
  APIError,
  initTransaction,
  commitTransaction,
  killTransaction,
  type CollectionConfig,
  type Field,
  type PayloadRequest,
  type Where,
} from "payload";
import { sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import {
  activeMemberships,
  committeeScopes,
  approvedAccount,
  accessibleCommittees,
  mayAccessResource,
  validSharing,
  type CommitteeAccount,
  type CommitteeArea,
  type CommitteeResource,
} from "./committeePolicy.ts";
import {
  committeeAccessEnabled,
  withCommitteeMode,
} from "./committeeEnvironment.ts";
import { accessPool, workspaceTable } from "./delegatedAccess.ts";
import {
  publicCareerSubmission,
  publicEventSubmission,
} from "./publicSubmissionContext.ts";

/** This capability stays inside the server module. HTTP context values cannot reproduce it. */
const reviewWrite = Symbol("committee-review-write");
const draftWrite = Symbol("committee-draft-write");
export const versionedCommitteeAreas = [
  "events",
  "careers",
  "committee",
  "sponsors",
  "organisations",
];
// Payload collection hooks merge dynamically shaped content after field validation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;
type CMSArea = Exclude<CommitteeArea, "mediaCalendar">;
const resource = (area: CommitteeArea, doc: Doc): CommitteeResource => ({
  area,
  owningScope: doc.owningScope,
  creator: doc.accessCreator,
  contributors: doc.accessContributors,
  sharedWith: doc.sharedWith,
});
const excluded = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "_status",
  "accessPublished",
  "accessReview",
  "accessCreator",
  "accessContributors",
  "sharedWith",
  "owningScope",
  "submittedForReview",
  "reviewStatus",
  "reviewedAt",
  "needsChanges",
  "lifecycle",
  "searchText",
]);
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export function contentRevision(doc: Doc) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        canonical(
          Object.fromEntries(
            Object.entries(doc).filter(
              ([k]) => !excluded.has(k) && !k.startsWith("_"),
            ),
          ),
        ),
      ),
    )
    .digest("hex");
}
export function guardCommitteeChange(
  area: CommitteeArea,
  data: Doc,
  original: Doc | undefined,
  actor: CommitteeAccount | null,
  trusted?: symbol,
  draftOnly = false,
): Doc {
  if (!committeeAccessEnabled()) {
    const owner = original?.owningScope ?? data.owningScope;
    if (owner && !(committeeScopes as readonly string[]).includes(owner))
      throw new APIError(
        "Project work requires workspace-aware enforcement.",
        403,
      );
    if(!original&&["sponsors","organisations","media"].includes(area))data.accessPublished=true;
    return data;
  }
  const account = actor ? withCommitteeMode(actor) : null,
    before = original ?? {
      ...data,
      accessCreator: String(account?.id),
      accessContributors: [],
    },
    r = resource(area, before);
  if (!approvedAccount(account))
    throw new APIError("You cannot manage content for this team.", 403);
  if (data.owningScope && original && data.owningScope !== original.owningScope)
    throw new APIError(
      "Record ownership cannot be transferred through an edit.",
      403,
    );
  for (const key of ["accessCreator", "accessContributors", "accessReview"])
    if (
      key in data &&
      trusted !== reviewWrite &&
      !(
        !original &&
        (data[key] == null ||
          (key === "accessContributors" &&
            Array.isArray(data[key]) &&
            data[key].length === 0))
      ) &&
      JSON.stringify(data[key]) !== JSON.stringify(before[key])
    )
      throw new APIError(
        "Review and authorship are maintained by the server.",
        403,
      );
  const next = { ...before, ...data };
  const changed =
    !original || contentRevision(next) !== contentRevision(before);
  if (
    original &&
    changed &&
    versionedCommitteeAreas.includes(area) &&
    !draftOnly
  )
    throw new APIError(
      "Save substantive changes as a draft before requesting review.",
      409,
    );
  const versioned = versionedCommitteeAreas.includes(area);
  const publishing = versioned
    ? data._status === "published"
    : data.accessPublished === true;
  const unpublishing = versioned
    ? !!original && !draftOnly && data._status === "draft"
    : original?.accessPublished === true && data.accessPublished === false;
  if (publishing || unpublishing) {
    if (!mayAccessResource(account, r, "publish"))
      throw new APIError(
        "An independent committee approver must publish this record.",
        403,
      );
    if (
      publishing &&
      (changed ||
        before.accessReview?.status !== "approved" ||
        before.accessReview.revision !== contentRevision(before) ||
        before.accessReview.approver !== String(account.id))
    )
      throw new APIError(
        "Approve the current revision before publication.",
        409,
      );
  } else if (
    trusted !== reviewWrite &&
    !mayAccessResource(account, r, original ? "edit" : "create")
  )
    throw new APIError("You cannot edit content for this team.", 403);
  if (!original && data.sharedWith == null) data.sharedWith = [];
  if ("sharedWith" in data) {
    if (!validSharing(data.sharedWith))
      throw new APIError("Choose valid record collaborators.", 400);
    if (!mayAccessResource(account, r, "share"))
      throw new APIError("Only the owning committee can manage sharing.", 403);
  }
  if (changed) {
    if (area === "media" && original?.accessPublished === true)
      throw new APIError(
        "Upload a new image to replace published media. Its current details stay unchanged.",
        409,
      );
    data.accessReview = null;
    data.accessContributors = [
      ...new Set([...(before.accessContributors ?? []), String(account.id)]),
    ];
    // Draft edits must never silently change the public document.
    if (versioned) data._status = "draft";
    else data.accessPublished = false;
  }
  if (!original) data.accessCreator = String(account.id);
  return data;
}
async function refreshRequestAuthority(req: PayloadRequest) {
  if (!req.user) return;
  const tx = (req.payload.db as unknown as PostgresAdapter).sessions[
    String(await req.transactionID)
  ]?.db;
  if (!tx) throw new APIError("Workspace writes require a transaction.", 503);
  const catalogue = await tx.execute(
    sql`SELECT id,status,areas FROM ${sql.raw(workspaceTable("access_workspaces"))} ORDER BY id FOR SHARE`,
  );
  const users = await tx.execute(
    sql`SELECT id,email,status,role,committee_memberships,committee_access_reviewed_at FROM ${sql.raw(workspaceTable("users"))} WHERE id=${req.user.id} FOR SHARE`,
  );
  const row = users.rows[0];
  if (!row) throw new APIError("Your access has changed.", 403);
  const current = rowAuthority(
    row as unknown as import("./workspaces/graph.ts").AccountRow,
    catalogue.rows as PolicyWorkspace[],
  );
  if (!approvedAccount(current))
    throw new APIError("Your access has changed.", 403);
  req.user = { ...req.user, ...current } as typeof req.user;
}
async function lockContent(
  req: PayloadRequest,
  area: CommitteeArea,
  id: string,
) {
  const tx = (req.payload.db as unknown as PostgresAdapter).sessions[
    String(await req.transactionID)
  ]?.db;
  if (!tx)
    throw new APIError(
      "Committee changes require a database transaction.",
      503,
    );
  await refreshRequestAuthority(req);
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext('committee-content'),hashtext(${`${area}:${id}`}))`,
  );
}
async function lockMedia(
  req: PayloadRequest,
  id: string | number,
  exclusive = false,
) {
  const tx = (req.payload.db as unknown as PostgresAdapter).sessions[
    String(await req.transactionID)
  ]?.db;
  if (!tx)
    throw new APIError("Media changes require a database transaction.", 503);
  await tx.execute(
    sql`SELECT id FROM ${sql.raw(workspaceTable("media"))} WHERE id=${id} ${sql.raw(exclusive ? "FOR UPDATE" : "FOR SHARE")}`,
  );
}
async function protectReferencedMedia(
  req: PayloadRequest,
  id: string | number,
) {
  await lockMedia(req, id, true);
  const tx = (req.payload.db as unknown as PostgresAdapter).sessions[
    String(await req.transactionID)
  ]!.db;
  for (const [parent, field] of [
    ["events", "poster_id"],
    ["committee", "portrait_id"],
    ["sponsors", "logo_id"],
  ] as const) {
    const found = await tx.execute(
      sql`SELECT id FROM ${sql.raw(workspaceTable(parent))} WHERE ${sql.raw(field)}=${id} LIMIT 1`,
    );
    const history = await tx.execute(
      sql`SELECT id FROM ${sql.raw(workspaceTable(`_${parent}_v`))} WHERE ${sql.raw(`version_${field}`)}=${id} LIMIT 1`,
    );
    if (found.rows.length || history.rows.length)
      throw new APIError(
        "This image is used by a listing or its history. Keep it so existing content remains available.",
        409,
      );
  }
}
/** Exact JSON containment; string matching on JSON could grant user 1 user 11's record. */
export async function committeeFilter(
  req: PayloadRequest,
  area: CommitteeArea,
  action: "view" | "edit" | "delete" = "view",
  versions = false,
): Promise<boolean | Where> {
  const actor = req.user
    ? withCommitteeMode(req.user as unknown as CommitteeAccount)
    : null;
  if (!approvedAccount(actor)) return false;
  const scopes = [
    ...new Set([
      ...accessibleCommittees(actor, area, action),
      ...(action === "edit"
        ? accessibleCommittees(actor, area, "approve")
        : []),
    ]),
  ];
  const clauses: Where[] = scopes.length
    ? [{ [versions ? "version.owningScope" : "owningScope"]: { in: scopes } }]
    : [];
  if (action !== "delete" && activeMemberships(actor).length) {
    const role = action === "edit" ? "editor" : null;
    const { rows } = await accessPool().query(
      `SELECT id FROM ${workspaceTable(area)} WHERE owning_scope=ANY($2::text[]) AND shared_with @> $1::jsonb${role ? "" : ""}`,
      [
        JSON.stringify([
          { userId: String(actor.id), ...(role ? { role } : {}) },
        ]),
        actor.accessCatalog
          ?.filter((w) => w.status === "active" && w.areas.includes(area))
          .map((w) => w.id) ?? [...committeeScopes],
      ],
    );
    if (rows.length)
      clauses.push({
        [versions ? "parent" : "id"]: { in: rows.map((r) => r.id) },
      });
  }
  return clauses.length ? { or: clauses } : false;
}
export async function attachedMediaIDs(
  req: PayloadRequest,
): Promise<(string | number)[]> {
  const ids = new Set<string | number>();
  for (const [collection, field] of [
    ["events", "poster"],
    ["committee", "portrait"],
    ["sponsors", "logo"],
  ] as const) {
    const { docs } = await req.payload.find({
      collection,
      req,
      overrideAccess: false,
      disableErrors: true,
      draft: !!req.user,
      depth: 0,
      pagination: false,
      select: { [field]: true },
    });
    for (const doc of docs as Doc[]) {
      const value = doc[field];
      if (value != null) ids.add(typeof value === "object" ? value.id : value);
    }
  }
  return [...ids];
}
export function committeeContent(
  collection: CollectionConfig,
): CollectionConfig {
  const area = collection.slug as CommitteeArea,
    originalRead = collection.access?.read;
  const privateRead = ({ req }: { req: PayloadRequest }) =>
    approvedAccount(req.user as unknown as CommitteeAccount);
  const managed: Field[] = [
    {
      name: "sharedWith",
      type: "json",
      defaultValue: [],
      access: { read: privateRead, create: () => false, update: () => false },
      admin: {
        components: { Field: "/components/admin/RecordSharing#RecordSharing" },
      },
      validate: (v) =>
        validSharing(v ?? []) ||
        "Use valid user IDs and Viewer or Editor roles.",
    },
    {
      name: "accessCreator",
      type: "text",
      access: { read: privateRead, create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: "accessContributors",
      type: "json",
      access: { read: privateRead, create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: "accessReview",
      type: "json",
      access: { read: privateRead, create: () => false, update: () => false },
      admin: { readOnly: true },
    },
    {
      name: "accessPublished",
      type: "checkbox",
      defaultValue: false,
      label: "Published",
      access: { create: () => false, update: () => false },
      admin: { readOnly: true },
    },
    {
      name: "committeeReview",
      type: "ui",
      admin: {
        components: {
          Field: "/components/admin/CommitteeReview#CommitteeReview",
        },
      },
    },
  ];
  const owned = collection.fields.some(
    (f) => "name" in f && f.name === "owningScope",
  );
  return {
    ...collection,
    ...(committeeAccessEnabled() && ["sponsors", "organisations"].includes(area)
      ? { versions: { drafts: true, maxPerDoc: 0 } }
      : {}),
    fields: [
      ...(!owned
        ? [
            {
              name: "owningScope",
              type: "text",
              admin: {
                components: {
                  Field:
                    "/components/admin/access/WorkspaceOwner#WorkspaceOwner",
                },
              },
              required: true,
              defaultValue: ({
                user,
                req,
              }: {
                user?: CommitteeAccount;
                req?: PayloadRequest;
              }) =>
                !committeeAccessEnabled()
                  ? "National"
                  : (accessibleCommittees(user, area, "create").find(
                      (s) => s === req?.query?.branch,
                    ) ?? accessibleCommittees(user, area, "create")[0]),
            } as Field,
          ]
        : []),
      ...collection.fields,
      ...managed,
    ],
    access: {
      ...collection.access,
      read: async (args) => {
        if (!committeeAccessEnabled()) {
          const base = originalRead ? await originalRead(args) : true;
          if(base===false)return false;
          if(!args.req.user){
            if(!["sponsors","organisations","media"].includes(area))return base;
            const published:Where={accessPublished:{equals:true}};
            return base===true?published:{and:[base,published]};
          }
          const legacy: Where = { owningScope: { in: [...committeeScopes] } };
          return base === true ? legacy : { and: [base, legacy] };
        }
        if (area === "media") {
          const base = args.req.user
            ? await committeeFilter(args.req, area)
            : { accessPublished: { equals: true } };
          const ids = await attachedMediaIDs(args.req);
          return ids.length
            ? {
                or: [
                  ...(base === false ? [] : [base as Where]),
                  { id: { in: ids } },
                ],
              }
            : base;
        }
        return args.req.user
          ? committeeFilter(args.req, area)
          : area === "organisations"
            ? false
            : versionedCommitteeAreas.includes(area)
              ? { _status: { equals: "published" } }
              : { accessPublished: { equals: true } };
      },
      create: (args) =>
        committeeAccessEnabled()
          ? !!args.req.user &&
            accessibleCommittees(
              withCommitteeMode(args.req.user as unknown as CommitteeAccount),
              area,
              "create",
            ).length > 0
          : collection.access!.create!(args),
      update: (args) =>
        committeeAccessEnabled()
          ? committeeFilter(args.req, area, "edit")
          : legacyWrite(collection.access!.update!(args)),
      delete: (args) =>
        committeeAccessEnabled()
          ? committeeFilter(args.req, area, "delete")
          : legacyWrite(collection.access!.delete!(args)),
      readVersions: (args) =>
        committeeAccessEnabled()
          ? committeeFilter(args.req, area, "view", true)
          : legacyWrite(collection.access?.readVersions?.(args) ?? false, true),
    },
    endpoints: [
      ...(collection.endpoints || []),
      ...(["get", "post"] as const).map((method) => ({
        path: "/:id/access-sharing",
        method,
        handler: async (req: PayloadRequest) => {
          let ownsTransaction = false;
          try {
            if (!committeeAccessEnabled() || !req.user)
              throw new APIError("Sign in to manage sharing.", 403);
            if (
              method === "post" &&
              req.headers.get("origin") !== process.env.GOOGLE_AUTH_ORIGIN
            )
              throw new APIError("Open this action inside the CMS.", 403);
            const id = String(req.routeParams?.id);
            let account = withCommitteeMode(
              req.user as unknown as CommitteeAccount,
            );
            if (method === "post") {
              ownsTransaction = await initTransaction(req);
              await lockContent(req, area, id);
              account = withCommitteeMode(
                req.user as unknown as CommitteeAccount,
              );
            }
            const doc = (await req.payload.findByID({
              collection: area as CMSArea,
              id,
              req,
              overrideAccess: false,
              draft: true,
              depth: 0,
            })) as Doc;
            if (!mayAccessResource(account, resource(area, doc), "share"))
              throw new APIError(
                "Only the owning committee can manage record sharing.",
                403,
              );
            let grants = doc.sharedWith ?? [];
            if (method === "post") {
              const body = await req.json!();
              if (
                body.remove &&
                typeof body.remove === "string" &&
                Object.keys(body).length === 1
              )
                grants = grants.filter(
                  (g: { userId: string }) => g.userId !== body.remove,
                );
              else {
                if (
                  typeof body.email !== "string" ||
                  !/^[^\s@]+@masca\.org\.au$/.test(
                    body.email.trim().toLowerCase(),
                  ) ||
                  !["viewer", "editor"].includes(body.role) ||
                  Object.keys(body).some((k) => !["email", "role"].includes(k))
                )
                  throw new APIError(
                    "Choose an approved MASCA email and Viewer or Editor.",
                    400,
                  );
                const { docs } = await req.payload.find({
                  collection: "users",
                  where: { email: { equals: body.email.trim().toLowerCase() } },
                  overrideAccess: true,
                  depth: 0,
                  limit: 1,
                  req,
                });
                const recipient = docs[0]
                  ? withCommitteeMode(docs[0] as unknown as CommitteeAccount)
                  : null;
                if (
                  !approvedAccount(recipient) ||
                  !activeMemberships(recipient).length
                )
                  throw new APIError(
                    "Share with an active, reviewed committee member.",
                    400,
                  );
                grants = [
                  ...grants.filter(
                    (g: { userId: string }) =>
                      g.userId !== String(recipient.id),
                  ),
                  { userId: String(recipient.id), role: body.role },
                ];
              }
              if (!validSharing(grants))
                throw new APIError("Too many record collaborators.", 400);
              await req.payload.update({
                collection: area as CMSArea,
                id,
                req,
                overrideAccess: true,
                draft: true,
                data: { sharedWith: grants },
                context: { ...req.context, committeeReview: reviewWrite },
              });
              const tx = (req.payload.db as unknown as PostgresAdapter)
                .sessions[String(await req.transactionID)]?.db;
              if (!tx)
                throw new APIError("Sharing requires a transaction.", 503);
              await tx.execute(
                sql`UPDATE ${sql.raw(workspaceTable(area))} SET shared_with=${JSON.stringify(grants)}::jsonb WHERE id=${id}`,
              );
              if (ownsTransaction) await commitTransaction(req);
            }
            const people = await Promise.all(
              grants.map(async (g: { userId: string; role: string }) => {
                try {
                  const person = await req.payload.findByID({
                    collection: "users",
                    id: g.userId,
                    overrideAccess: true,
                    depth: 0,
                    req,
                  });
                  return { ...g, email: person.email };
                } catch {
                  return { ...g, email: "Unavailable account" };
                }
              }),
            );
            return Response.json(
              { people },
              { headers: { "Cache-Control": "private, no-store" } },
            );
          } catch (error) {
            return Response.json(
              {
                error:
                  error instanceof APIError
                    ? error.message
                    : "Sharing could not be saved.",
              },
              { status: error instanceof APIError ? error.status : 500 },
            );
          } finally {
            if (ownsTransaction && req.transactionID)
              await killTransaction(req);
          }
        },
      })),
      {
        path: "/:id/access-review",
        method: "post",
        handler: async (req) => {
          if (!committeeAccessEnabled() || !req.user)
            return Response.json(
              { error: "Committee review is unavailable." },
              { status: 403 },
            );
          let ownsTransaction = false;
          try {
            if (req.headers.get("origin") !== process.env.GOOGLE_AUTH_ORIGIN)
              throw new APIError(
                "Open this review action inside the CMS.",
                403,
              );
            const { action } = await req.json!(),
              id = String(req.routeParams?.id);
            ownsTransaction = await initTransaction(req);
            await lockContent(req, area, id);
            const doc = (await req.payload.findByID({
              collection: area as CMSArea,
              id,
              req,
              overrideAccess: false,
              draft: true,
              depth: 0,
            })) as Doc;
            const account = withCommitteeMode(
              req.user as unknown as CommitteeAccount,
            );
            if (
              !["submit", "approve", "publish", "unpublish"].includes(action) ||
              !mayAccessResource(
                account,
                resource(area, doc),
                action === "approve"
                  ? "approve"
                  : action === "submit"
                    ? "edit"
                    : "publish",
              )
            )
              throw new APIError("This review action is not permitted.", 403);
            if (action === "publish" || action === "unpublish") {
              const data = versionedCommitteeAreas.includes(area)
                ? {
                    _status: action === "publish" ? "published" : "draft",
                    ...(["sponsors", "organisations"].includes(area)
                      ? { accessPublished: action === "publish" }
                      : {}),
                    ...(area === "events" && action === "publish"
                      ? {
                          reviewStatus: "approved",
                          reviewedAt: new Date().toISOString(),
                          submittedForReview: false,
                        }
                      : {}),
                  }
                : { accessPublished: action === "publish" };
              guardCommitteeChange(area, data, doc, account);
              await req.payload.update({
                collection: area as CMSArea,
                id,
                req,
                overrideAccess: true,
                data: data as never,
              });
              if (ownsTransaction) await commitTransaction(req);
              return Response.json(
                { published: action === "publish" },
                { headers: { "Cache-Control": "private, no-store" } },
              );
            }
            const accessReview =
              action === "approve"
                ? {
                    status: "approved",
                    revision: contentRevision(doc),
                    approver: String(account.id),
                    approvedAt: new Date().toISOString(),
                  }
                : { status: "submitted", revision: contentRevision(doc) };
            await req.payload.update({
              collection: area as CMSArea,
              id,
              req,
              overrideAccess: true,
              draft: true,
              context: { ...req.context, committeeReview: reviewWrite },
              data: { accessReview },
            });
            if (ownsTransaction) await commitTransaction(req);
            return Response.json(
              { accessReview },
              { headers: { "Cache-Control": "private, no-store" } },
            );
          } catch (error) {
            return Response.json(
              {
                error:
                  error instanceof APIError
                    ? error.message
                    : "Review could not be saved.",
              },
              { status: error instanceof APIError ? error.status : 500 },
            );
          } finally {
            if (ownsTransaction && req.transactionID)
              await killTransaction(req);
          }
        },
      },
    ],
    hooks: {
      ...collection.hooks,
      beforeOperation: [
        ...(collection.hooks?.beforeOperation ?? []),
        async ({ args, operation }) => {
          if (committeeAccessEnabled() && operation === "update") {
            const update = args as {
              id?: string | number;
              req: PayloadRequest;
              draft?: boolean;
              data?: Doc;
            };
            // Bulk mutation cannot bypass per-record locking or review checks.
            if (update.id == null)
              throw new APIError("Edit committee records individually.", 403);
            await lockContent(update.req, area, String(update.id));
            update.req.context.committeeDraft =
              update.draft && update.data?._status !== "published"
                ? draftWrite
                : undefined;
          }
          if (
            committeeAccessEnabled() &&
            (operation === "create" || operation === "delete")
          )
            await refreshRequestAuthority(args.req);
          return args;
        },
      ],
      beforeDelete: [
        ...(collection.hooks?.beforeDelete ?? []),
        async ({ req, id }) => {
          if (committeeAccessEnabled() && area === "media")
            await protectReferencedMedia(req, id);
        },
      ],
      beforeChange: [
        ({ data, originalDoc, req, context, operation }) => {
          if (
            operation === "create" &&
            area === "media" &&
            data.owningScope === "National" &&
            context.publicEventSubmission === publicEventSubmission
          )
            return {
              ...data,
              accessCreator: "public-submission",
              accessContributors: [],
              accessReview: null,
              accessPublished: false,
              sharedWith: [],
            };
          if (
            operation === "create" &&
            data.owningScope === "National" &&
            data._status === "draft" &&
            ((area === "events" &&
              context.publicEventSubmission === publicEventSubmission &&
              data.reviewStatus === "pending") ||
              (area === "careers" &&
                context.publicCareerSubmission === publicCareerSubmission &&
                data.submittedForReview === true))
          )
            return {
              ...data,
              accessCreator: "public-submission",
              accessContributors: [],
              accessReview: null,
            };
          return guardCommitteeChange(
            area,
            data,
            operation === "create" ? undefined : originalDoc,
            req.user as unknown as CommitteeAccount,
            context.committeeReview as symbol,
            context.committeeDraft === draftWrite,
          );
        },
        async ({ data, originalDoc, req, context, operation }) => {
          const relation =
            area === "events"
              ? "poster"
              : area === "committee"
                ? "portrait"
                : area === "sponsors"
                  ? "logo"
                  : null;
          if (committeeAccessEnabled() && relation && data[relation]) {
            const id =
              typeof data[relation] === "object"
                ? data[relation].id
                : data[relation];
            const previous =
              typeof originalDoc?.[relation] === "object"
                ? originalDoc[relation]?.id
                : originalDoc?.[relation];
            if (String(id) !== String(previous)) {
              await lockMedia(req, id);
              const asset = (await req.payload.findByID({
                collection: "media",
                id,
                req,
                overrideAccess: true,
                depth: 0,
              })) as Doc;
              const account = req.user
                ? withCommitteeMode(req.user as unknown as CommitteeAccount)
                : null;
              const publicPoster =
                operation === "create" &&
                area === "events" &&
                context.publicEventSubmission === publicEventSubmission &&
                data.owningScope === "National" &&
                asset.accessCreator === "public-submission" &&
                asset.owningScope === "National";
              if (
                !publicPoster &&
                asset.accessPublished !== true &&
                !mayAccessResource(account, resource("media", asset), "view")
              )
                throw new APIError(
                  "Choose an image you are permitted to access.",
                  403,
                );
            }
          }
          return data;
        },
        ...(collection.hooks?.beforeChange ?? []),
      ],
    },
  };
}

async function legacyWrite(
  base: boolean | Where | Promise<boolean | Where>,
  versions = false,
): Promise<boolean | Where> {
  const result = await base;
  if (result === false) return false;
  const owner: Where = {
    [versions ? "version.owningScope" : "owningScope"]: {
      in: [...committeeScopes],
    },
  };
  return result === true ? owner : { and: [result, owner] };
}
