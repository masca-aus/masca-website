import { assignArea } from "./membershipEdits.ts";
import { randomUUID } from "node:crypto";
import { APIError } from "payload";
import { z } from "zod";
import type pg from "pg";
import {
  accessPool,
  workspaceTable,
  membershipChange,
} from "../delegatedAccess.ts";
import { committeeAccessEnabled } from "../committeeEnvironment.ts";
import {
  isSubtractiveMembershipChange,
  committeeAreas,
  committeeRoles,
  mayManageCommittee,
  validMemberships,
  type CommitteeAccount,
  type CommitteeArea,
  type CommitteeMembership,
  type CommitteeRole,
} from "../committeePolicy.ts";
import { loadWorkspaceCatalog, validateWorkspace } from "./repository.ts";
import { accessSnapshot, currentActor, type AccountRow } from "./graph.ts";
const key = z.string().min(1).max(100),
  revision = key;
const email = z
  .string()
  .max(254)
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.string().regex(/^[^\s@]+@masca\.org\.au$/));
const name = z.string().trim().min(1).max(80);
const workspaceFields = {
  name,
  kind: z.enum(["committee", "project"]),
  areas: z.array(z.enum(committeeAreas)).max(7),
  termEnd: z.string().datetime({ offset: true }).nullable().optional(),
  sponsorId: key.nullable().optional(),
};
const existing = { workspaceId: key, expectedRevision: revision };
const membershipBase = {
  workspaceId: key,
  expectedWorkspaceRevision: revision,
  targetId: key.optional(),
  email: email.optional(),
  name: name.optional(),
  expectedRevision: revision,
};
const membership = z
  .object({
    id: key,
    committee: key,
    roles: z.partialRecord(
      z.enum(committeeAreas),
      z.array(z.enum(committeeRoles)).max(3),
    ),
    expiresAt: z.string().datetime({ offset: true }),
    manager: z.boolean(),
  })
  .strict();
const mutationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("createWorkspace"), ...workspaceFields }).strict(),
  z
    .object({
      type: z.literal("configureWorkspace"),
      ...existing,
      ...workspaceFields,
    })
    .strict(),
  z.object({ type: z.literal("archiveWorkspace"), ...existing }).strict(),
  z.object({ type: z.literal("restoreWorkspace"), ...existing }).strict(),
  z.object({ type: z.literal("addPerson"), email, name }).strict(),
  z
    .object({
      type: z.literal("assignArea"),
      ...membershipBase,
      area: z.enum(committeeAreas),
      roles: z.array(z.enum(committeeRoles)).min(1).max(3),
      expiresAt: z.string().datetime({ offset: true }).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("removeArea"),
      ...membershipBase,
      area: z.enum(committeeAreas),
    })
    .strict(),
  z
    .object({
      type: z.literal("saveMembership"),
      ...membershipBase,
      membership,
    })
    .strict(),
  z
    .object({
      type: z.literal("renewMembership"),
      ...membershipBase,
      expiresAt: z.string().datetime({ offset: true }),
    })
    .strict(),
  z.object({ type: z.literal("removeMembership"), ...membershipBase }).strict(),
]);
export type AccessMutation = z.infer<typeof mutationSchema>;
export function parseMutation(value: unknown): AccessMutation {
  const result = mutationSchema.safeParse(value);
  if (!result.success)
    throw new APIError("Check the person, role, workspace and term.", 400);
  return result.data;
}
export function mergeArea(
  m: CommitteeMembership,
  area: CommitteeArea,
  roles: CommitteeRole[],
): CommitteeMembership {
  return assignArea(m, area, roles);
}
async function audit(
  c: pg.PoolClient,
  actor: CommitteeAccount,
  target: string,
  workspace: string,
  action: string,
  before: unknown,
  after: unknown,
) {
  await c.query(
    `INSERT INTO ${workspaceTable("committee_access_audit")}(id,actor_id,target_id,committee,action,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`,
    [
      randomUUID(),
      String(actor.id),
      target,
      workspace,
      action,
      JSON.stringify(before ?? null),
      JSON.stringify(after ?? null),
    ],
  );
}
const conflict = () =>
  new APIError(
    "Access changed while you were editing. Refresh and review before saving.",
    409,
  );
async function findPerson(
  c: pg.PoolClient,
  input: { targetId?: string; email?: string; name?: string },
  actor: CommitteeAccount,
): Promise<AccountRow> {
  if (input.targetId && input.email)
    throw new APIError("Choose a person or enter an email.", 400);
  const { rows } = await c.query(
    `SELECT * FROM ${workspaceTable("users")} WHERE ${input.targetId ? "id::text=$1" : "lower(trim(email))=$1"} FOR UPDATE`,
    [input.targetId ?? input.email],
  );
  if (rows[0]) {
    if (actor.role !== "administrator" && !rows[0].committee_access_reviewed_at)
      throw new APIError(
        "An administrator must review this account first.",
        403,
      );
    return rows[0];
  }
  if (input.targetId || !input.email)
    throw new APIError("Person not found.", 404);
  const { rows: created } = await c.query(
    `INSERT INTO ${workspaceTable("users")}(email,display_name,role,status,session_revision,committee_memberships,committee_access_revision,committee_access_reviewed_at,committee_access_reviewed_by,created_at,updated_at) VALUES($1,$2,'editor','invited',$3,'[]',gen_random_uuid()::text,now(),$4,now(),now()) RETURNING *`,
    [input.email, input.name ?? null, randomUUID(), String(actor.id)],
  );
  await audit(c, actor, String(created[0].id), "National", "add-person", null, {
    email: input.email,
  });
  return created[0];
}
export async function mutateAccess(actor: CommitteeAccount, value: unknown) {
  const input = parseMutation(value);
  if (!committeeAccessEnabled())
    throw new APIError(
      "Workspace access is staged. Complete the rollout review before changing access.",
      403,
    );
  const c = await accessPool().connect();
  try {
    await c.query("BEGIN");
    // Access metadata mutations are short, low-volume operations. One lock gives a
    // consistent catalogue/account lock order, including first-email invitations.
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtext('masca-workspace-access'))",
    );
    const catalog = await loadWorkspaceCatalog(c),
      current = await currentActor(c, actor, catalog, "FOR UPDATE");
    const platform = current.role === "administrator";
    if (
      [
        "createWorkspace",
        "configureWorkspace",
        "archiveWorkspace",
        "restoreWorkspace",
        "addPerson",
      ].includes(input.type) &&
      !platform
    )
      throw new APIError(
        "Only platform administrators can change this setting.",
        403,
      );
    if (input.type === "addPerson") await findPerson(c, input, current);
    else if (input.type === "createWorkspace") {
      const data = validateWorkspace({
        name: input.name,
        kind: input.kind,
        areas: input.areas,
        termEnd: input.termEnd ?? null,
        sponsorId: input.sponsorId ?? null,
      });
      if (
        data.sponsorId &&
        !catalog.some(
          (w) =>
            w.id === data.sponsorId &&
            w.kind === "committee" &&
            w.status === "active",
        )
      )
        throw new APIError("Choose an active sponsoring committee.", 400);
      const id = `ws-${randomUUID()}`;
      await c.query(
        `INSERT INTO ${workspaceTable("access_workspaces")}(id,name,kind,areas,term_end,sponsor_id) VALUES($1,$2,$3,$4::jsonb,$5,$6)`,
        [
          id,
          data.name,
          data.kind,
          JSON.stringify(data.areas),
          data.termEnd,
          data.sponsorId,
        ],
      );
      await audit(c, current, id, id, "create-workspace", null, data);
    } else {
      const w = catalog.find((w) => w.id === input.workspaceId);
      if (!w) throw new APIError("Workspace not found.", 404);
      if (
        input.type === "configureWorkspace" ||
        input.type === "archiveWorkspace" ||
        input.type === "restoreWorkspace"
      ) {
        if (w.revision !== input.expectedRevision) throw conflict();
        let after = w;
        if (input.type === "configureWorkspace") {
          const data = validateWorkspace({
            name: input.name,
            kind: input.kind,
            areas: input.areas,
            termEnd: input.termEnd ?? null,
            sponsorId: input.sponsorId ?? null,
          });
          if (
            data.sponsorId === w.id ||
            (data.sponsorId &&
              !catalog.some(
                (s) =>
                  s.id === data.sponsorId &&
                  s.kind === "committee" &&
                  s.status === "active",
              ))
          )
            throw new APIError(
              "Choose another active committee as sponsor.",
              400,
            );
          const removed = w.areas.filter((a) => !data.areas.includes(a));
          if (removed.length) {
            const { rows } = await c.query(
              `SELECT committee_memberships FROM ${workspaceTable("users")}`,
            );
            if (
              rows.some((r) =>
                (r.committee_memberships ?? []).some(
                  (m: CommitteeMembership) =>
                    m.committee === w.id &&
                    removed.some((a) => m.roles[a]?.length),
                ),
              )
            )
              throw new APIError(
                "Review and remove assigned roles before disabling a tool, including expired memberships.",
                400,
              );
          }
          after = { ...w, ...data };
        } else
          after = {
            ...w,
            status: input.type === "archiveWorkspace" ? "archived" : "active",
          };
        await c.query(
          `UPDATE ${workspaceTable("access_workspaces")} SET name=$1,kind=$2,status=$3,areas=$4::jsonb,term_end=$5,sponsor_id=$6,revision=gen_random_uuid()::text,updated_at=now() WHERE id=$7`,
          [
            after.name,
            after.kind,
            after.status,
            JSON.stringify(after.areas),
            after.termEnd,
            after.sponsorId,
            w.id,
          ],
        );
        await audit(c, current, w.id, w.id, input.type, w, after);
      } else {
        if (!mayManageCommittee(current, w.id))
          throw new APIError("You cannot manage this workspace.", 403);
        if (w.revision !== input.expectedWorkspaceRevision) throw conflict();
        const target = await findPerson(c, input, current);
        const before = target.committee_memberships ?? [],
          old = before.find((m) => m.committee === w.id);
        // Email reuse is a first-assignment convenience, never a way around revision review.
        if (input.expectedRevision === "new") {
          if (old || input.targetId) throw conflict();
        } else if (target.committee_access_revision !== input.expectedRevision)
          throw conflict();
        if (target.status === "suspended")
          throw new APIError(
            "This account is suspended. An administrator must reactivate it.",
            403,
          );
        let m: CommitteeMembership | null = old ?? null;
        if (input.type === "assignArea") {
          if (!w.areas.includes(input.area))
            throw new APIError(
              "Enable this tool before assigning access.",
              400,
            );
          if (!m) {
            if (!input.expiresAt)
              throw new APIError("Confirm the term end date.", 400);
            m = {
              id: randomUUID(),
              committee: w.id,
              roles: {},
              expiresAt: input.expiresAt,
              manager: false,
            };
          }
          m = mergeArea(m, input.area, input.roles);
        } else if (input.type === "removeArea") {
          if (!m) throw conflict();
          m = { ...m, roles: { ...m.roles } };
          delete m.roles[input.area];
        } else if (input.type === "saveMembership") {
          m = input.membership;
          if (m.committee !== w.id || m.id !== (old?.id ?? m.id))
            throw new APIError("Membership identity cannot change.", 400);
          if (old && old.expiresAt !== m.expiresAt)
            throw new APIError(
              "Use Renew term to change the membership expiry.",
              400,
            );
        } else if (input.type === "renewMembership") {
          if (!m) throw conflict();
          m = { ...m, expiresAt: input.expiresAt };
        } else m = null;
        if (
          m &&
          ((Date.parse(m.expiresAt) <= Date.now() &&
            !isSubtractiveMembershipChange(old, m)) ||
            Object.entries(m.roles).some(
              ([area, roles]) =>
                roles?.length && !w.areas.includes(area as CommitteeArea),
            ))
        )
          throw new APIError(
            "Choose enabled tools and a future term end.",
            400,
          );
        const next = membershipChange(
          current,
          before,
          w.id,
          m,
          String(target.id),
        );
        if (!validMemberships(next, catalog))
          throw new APIError("Invalid memberships.", 400);
        await c.query(
          `UPDATE ${workspaceTable("users")} SET committee_memberships=$1::jsonb,committee_access_revision=gen_random_uuid()::text,session_revision=$2,committee_access_reviewed_at=COALESCE(committee_access_reviewed_at,now()),committee_access_reviewed_by=COALESCE(committee_access_reviewed_by,$3),updated_at=now() WHERE id=$4`,
          [JSON.stringify(next), randomUUID(), String(current.id), target.id],
        );
        await audit(c, current, String(target.id), w.id, input.type, old, m);
      }
    }
    const snapshot = await accessSnapshot(current, c);
    await c.query("COMMIT");
    return { snapshot };
  } catch (e) {
    await c.query("ROLLBACK");
    if ((e as { code?: string }).code === "23505")
      throw new APIError(
        "That name or account already exists. Refresh and review it.",
        409,
      );
    throw e;
  } finally {
    c.release();
  }
}
