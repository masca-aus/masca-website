import {loadWorkspaceCatalog} from "../access/workspaces/repository.ts";
import {withWorkspaceAuthority} from "../access/workspaces/policyContext.ts";
import type {PolicyWorkspace} from "../access/workspaces/types.ts";
import {committeeAccessEnabled} from "../access/committeeEnvironment.ts";
import { withCommitteeMode } from "../access/committeeEnvironment.ts";
import {
  committeeMode,
  activeMemberships,
  accessibleCommittees,
  type CommitteeScope,
} from "../access/committeePolicy.ts";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { calendarSchema } from "./schema.ts";
import { workspaceSchema } from "../access/workspaceEnvironment.ts";
import {
  mayUseCalendar,
  mayEnterCalendar,
  mayAccessPost,
  mayApprove,
  mayManagePost,
} from "./policy.ts";
import { applyAction, newPost } from "./service.ts";
import { CalendarError, type Action } from "./validation.ts";
import type { Asset, CalendarUser, Post, Category } from "./types.ts";
const pools = globalThis as typeof globalThis & { calendarPool?: pg.Pool };
function pool() {
  return (pools.calendarPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URI,
    max: 4,
    connectionTimeoutMillis: 10000,
  }));
}
export const table = (
  name: "posts" | "assets" | "categories" | "revisions" | "notifications",
) => `"${calendarSchema()}"."${name}"`;
export async function transaction<T>(
  actor: CalendarUser,
  capability: "view" | "edit" | "approve",
  operation: (client: pg.PoolClient, user: CalendarUser) => Promise<T>,
): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const catalog=committeeAccessEnabled()?await loadWorkspaceCatalog(c):undefined;
    const { rows } = await c.query(
      `SELECT id,email,status,role,calendar_access,committee_memberships,committee_access_reviewed_at,committee_access_reviewed_by FROM "${workspaceSchema()}".users WHERE id=$1 FOR SHARE`,
      [actor.id],
    );
    const row = rows[0],
      user = row ? calendarAccount(row,catalog) : null;
    if (
      !user ||
      !(committeeMode(user)
        ? mayEnterCalendar(user)
        : mayUseCalendar(user, capability))
    )
      throw new CalendarError(
        "Your calendar access has changed. Please contact an administrator.",
        403,
      );
    const result = await operation(c, user);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export function calendarAccount(row: Record<string, unknown>,catalog?:PolicyWorkspace[]): CalendarUser {
  const account=withCommitteeMode({
    ...row,
    calendarAccess: row.calendar_access,
    committeeMemberships: row.committee_memberships ?? [],
    committeeAccessReviewedAt: row.committee_access_reviewed_at,
    committeeAccessReviewedBy: row.committee_access_reviewed_by,
  } as CalendarUser);
  return catalog?withWorkspaceAuthority(account,catalog):account;
}
export function requirePostAccess(
  user: CalendarUser,
  p: Post,
  action: import("../access/committeePolicy").CommitteeAction = "view",
) {
  if (!mayAccessPost(user, p, action))
    throw new CalendarError("This post is not available to your account.", 403);
}
export async function membersFor(
  c: pg.PoolClient,
  user: CalendarUser,
  resource: { owningScope?: CommitteeScope; sharedWith?: Post["sharedWith"] },
) {
  const { rows } = await c.query(
    `SELECT id,email,status,role,calendar_access,committee_memberships,committee_access_reviewed_at,committee_access_reviewed_by FROM "${workspaceSchema()}".users`,
  );
  return rows
    .map(r=>calendarAccount(r,user.accessCatalog))
    .filter((r) => mayAccessPost(r, resource, "view"))
    .map((r) => ({
      id: String(r.id),
      name: r.email.split("@")[0].replace(/[._]/g, " "),
      edit: mayAccessPost(r, resource, "edit"),
      approve: mayAccessPost(r, resource, "approve"),
    }));
}
export async function sharingTargets(actor: CalendarUser, id: string) {
  return transaction(actor, "view", async (c, user) => {
    const p = await lockedPost(c, id);
    requirePostAccess(user, p, "share");
    const { rows } = await c.query(
      `SELECT id,email,status,role,calendar_access,committee_memberships,committee_access_reviewed_at,committee_access_reviewed_by FROM "${workspaceSchema()}".users`,
    );
    return rows
      .map(r=>calendarAccount(r,user.accessCatalog))
      .filter((r) =>
        committeeMode(user)
          ? activeMemberships(r).length > 0
          : mayUseCalendar(r, "view"),
      )
      .map((r) => ({
        id: String(r.id),
        name: r.email.split("@")[0].replace(/[._]/g, " "),
        edit: false,
        approve: false,
      }));
  });
}
export async function savePost(c: pg.PoolClient, p: Post) {
  await c.query(
    `INSERT INTO ${table("posts")}(id,planned_at,status,category,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET planned_at=$2,status=$3,category=$4,data=$5`,
    [p.id, p.plannedAt, p.status, p.category, JSON.stringify(p)],
  );
}
export async function lockedPost(
  c: pg.PoolClient,
  id: string,
  includeDeleted = false,
): Promise<Post> {
  const { rows } = await c.query(
    `SELECT data FROM ${table("posts")} WHERE id=$1 FOR UPDATE`,
    [id],
  );
  if (!rows.length) throw new CalendarError("Post not found.", 404);
  if (rows[0].data.deletedAt && !includeDeleted)
    throw new CalendarError("This post was deleted.", 404);
  return rows[0].data;
}
export async function checkRelations(
  c: pg.PoolClient,
  p: Post,
  validatePeople = true,
  user?: CalendarUser,
) {
  if (user) requirePostAccess(user, p);
  if (p.category) {
    const r = await c.query(
      `SELECT data FROM ${table("categories")} WHERE id=$1 FOR KEY SHARE`,
      [p.category],
    );
    if (
      !r.rows.length ||
      (r.rows[0].data.owningScope ?? "National") !==
        (p.owningScope ?? "National")
    )
      throw new CalendarError("Choose an existing category in this committee.");
  }
  if (p.assets.length) {
    const { rows } = await c.query(
      `SELECT data FROM ${table("assets")} WHERE post_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE`,
      [p.id, p.assets],
    );
    if (
      rows.length !== p.assets.length ||
      rows.some((r) => !(r.data as Asset).ready)
    )
      throw new CalendarError(
        "Wait for all media uploads to finish before saving or reviewing.",
      );
  }
  if (p.type === "feed" && p.assets.length > 1)
    throw new CalendarError("Choose Carousel for multiple images.");
  if (["reel", "story"].includes(p.type) && p.assets.length > 1)
    throw new CalendarError("Use one media file for a Reel or Story.");
  if (p.type === "reel" && p.assets.length) {
    const r = await c.query(`SELECT data FROM ${table("assets")} WHERE id=$1`, [
      p.assets[0],
    ]);
    if (!r.rows[0].data.mime.startsWith("video/"))
      throw new CalendarError("A Reel needs a video file.");
  }
  const people = Array.from(new Set([p.owner, ...p.collaborators]));
  if (validatePeople && people.length) {
    const { rows } = await c.query(
      `SELECT id,email,status,role,calendar_access,committee_memberships,committee_access_reviewed_at,committee_access_reviewed_by FROM "${workspaceSchema()}".users WHERE id::text=ANY($1::text[])`,
      [people],
    );
    if (
      rows.length !== people.length ||
      rows.some((r) => !mayAccessPost(calendarAccount(r,user?.accessCatalog), p, "view"))
    )
      throw new CalendarError("Choose current calendar members.");
  }
}
async function checkpoint(
  c: pg.PoolClient,
  p: Post,
  user: CalendarUser,
  action: string,
) {
  if (
    action !== "caption" ||
    Date.now() - Date.parse(p.checkpointAt) >= 30000
  ) {
    p.checkpointAt = new Date().toISOString();
    await c.query(
      `INSERT INTO ${table("revisions")}(post_id,author,action,data) VALUES($1,$2,$3,$4)`,
      [p.id, String(user.id), action, JSON.stringify({ ...p, comments: [] })],
    );
  }
}
async function notify(
  c: pg.PoolClient,
  p: Post,
  user: CalendarUser,
  a: Action,
) {
  let recipients: string[] = [],
    message = "";
  if (a.action === "review") {
    const r = await c.query(
      `SELECT id,email,status,role,calendar_access,committee_memberships,committee_access_reviewed_at,committee_access_reviewed_by FROM "${workspaceSchema()}".users`,
    );
    recipients = r.rows
      .filter(
        (r) =>
          mayApprove(calendarAccount(r,user.accessCatalog), p) &&
          !p.contributors.includes(String(r.id)),
      )
      .map((r) => String(r.id));
    message = `Review requested: ${p.title}`;
  }
  if (a.action === "changes" || a.action === "approve") {
    recipients = [p.creator, p.owner, ...p.collaborators];
    message = `${a.action === "changes" ? "Changes requested" : "Approved"}: ${p.title}`;
  }
  if (a.action === "comment") {
    recipients = a.mentions;
    message = `You were mentioned: ${p.title}`;
  }
  if (!recipients.length) return;
  const eligible = await membersFor(c, user, p);
  for (const recipient of new Set(
    recipients.filter(
      (r) => r !== String(user.id) && eligible.some((m) => m.id === r),
    ),
  ))
    await c.query(
      `INSERT INTO ${table("notifications")}(id,recipient,post_id,message) VALUES($1,$2,$3,$4)`,
      [randomUUID(), recipient, p.id, message],
    );
}
export async function createPost(actor: CalendarUser, input: unknown) {
  return transaction(actor, "edit", async (c, user) => {
    const p = newPost(user, input);
    await checkRelations(c, p, true, user);
    await savePost(c, p);
    await checkpoint(c, p, user, "create");
    return p;
  });
}
export async function mutatePost(actor: CalendarUser, id: string, a: Action) {
  return transaction(actor, "view", async (c, user) => {
    const p = await lockedPost(c, id, a.action === "restore");
    requirePostAccess(user, p);
    if (a.action === "share") {
      requirePostAccess(user, p, "share");
      // Removing/downgrading old grants must remain possible after their members expire.
      const changedGrants=a.sharedWith.filter(grant=>!(p.sharedWith??[]).some(old=>old.userId===grant.userId&&(old.role===grant.role||old.role==='editor'&&grant.role==='viewer')));
      const { rows } = await c.query(
        `SELECT id,email,status,role,calendar_access,committee_memberships,committee_access_reviewed_at,committee_access_reviewed_by FROM "${workspaceSchema()}".users WHERE id::text=ANY($1::text[]) FOR SHARE`,
        [changedGrants.map((g) => g.userId)],
      );
      if (
        rows.length !== changedGrants.length ||
        rows
          .map(r=>calendarAccount(r,user.accessCatalog))
          .some((r) =>
            committeeMode(user)
              ? !activeMemberships(r).length
              : !mayUseCalendar(r, "view"),
          )
      )
        throw new CalendarError("Choose active approved MASCA members.");
    }
    if (a.action === "comment" && a.mentions.length) {
      const eligible = await membersFor(c, user, p);
      if (a.mentions.some((id) => !eligible.some((m) => m.id === id)))
        throw new CalendarError(
          "Mentions must already have access to this post.",
        );
    }
    if (a.action === "duplicate") {
      if (!mayManagePost(user, p, "create"))
        throw new CalendarError(
          "An owning committee editor must duplicate this post.",
          403,
        );
      if (a.expectedRevision !== p.contentRevision)
        throw new CalendarError(
          "The content changed. Reopen the post before duplicating.",
          409,
        );
      const copy = newPost(user, {
        owningScope: p.owningScope ?? "National",
        title: `${p.title} (copy)`,
        type: p.type,
        category: p.category,
        links: p.links,
      });
      copy.caption = p.caption;
      copy.captionState = p.captionState;
      await savePost(c, copy);
      // Make independent asset references: immutable objects are shared privately; not deleted while referenced.
      for (const id of p.assets) {
        const result = await c.query(
          `SELECT data FROM ${table("assets")} WHERE id=$1`,
          [id],
        );
        if (result.rows.length) {
          const asset = {
            ...result.rows[0].data,
            id: randomUUID(),
            postId: copy.id,
            createdBy: String(user.id),
          };
          await c.query(
            `INSERT INTO ${table("assets")}(id,post_id,data) VALUES($1,$2,$3)`,
            [asset.id, copy.id, JSON.stringify(asset)],
          );
          copy.assets.push(asset.id);
        }
      }
      await savePost(c, copy);
      await checkpoint(c, copy, user, "duplicate");
      return copy;
    }
    if (a.action === "review") {
      const pending = await c.query(
        `SELECT id FROM ${table("assets")} WHERE post_id=$1 AND data->>'ready'='false' AND COALESCE(data->>'cancelled','false')='false' AND (data->>'createdAt')::timestamptz>now()-interval '1 day' LIMIT 1`,
        [id],
      );
      if (pending.rows.length)
        throw new CalendarError(
          "Finish or cancel pending uploads before requesting review.",
        );
    }
    const changed = applyAction(p, user, a);
    if (!["draft", "delete", "restore"].includes(a.action))
      await checkRelations(
        c,
        p,
        a.action === "patch" &&
          (Object.hasOwn(a.patch, "owner") ||
            Object.hasOwn(a.patch, "collaborators")),
        user,
      );
    if (changed) {
      await checkpoint(c, p, user, a.action);
      await savePost(c, p);
      await notify(c, p, user, a);
    }
    return p;
  });
}
export async function detail(actor: CalendarUser, id: string) {
  return transaction(actor, "view", async (c, user) => {
    // One MVCC snapshot keeps the post, assets and history consistent without
    // locking the post against a teammate's save. Writes still use lockedPost.
    const { rows } = await c.query(
      `SELECT p.data AS post,
        COALESCE((SELECT jsonb_agg(c.data ORDER BY c.data->>'name') FROM ${table("categories")} c
          WHERE COALESCE(c.data->>'owningScope','National')=COALESCE(p.data->>'owningScope','National')
          AND (NOT $2::boolean OR COALESCE(p.data->>'owningScope','National')=ANY($3::text[]) OR c.id=p.category)),'[]'::jsonb) AS categories,
        COALESCE((SELECT jsonb_agg(a.data ORDER BY array_position(
          ARRAY(SELECT jsonb_array_elements_text(p.data->'assets')),a.id::text))
          FROM ${table("assets")} a WHERE a.post_id=p.id AND p.data->'assets' ? a.id::text),'[]'::jsonb) AS assets,
        COALESCE((SELECT jsonb_agg(a.data) FROM ${table("assets")} a
          WHERE a.post_id=p.id AND a.data->>'ready'='false'
          AND COALESCE(a.data->>'cancelled','false')='false'
          AND (a.data->>'createdAt')::timestamptz>now()-interval '1 day'),'[]'::jsonb) AS "pendingUploads",
        COALESCE((SELECT jsonb_agg(h ORDER BY h."createdAt" DESC,h.id::bigint DESC) FROM (
          SELECT r.id::text,author,action,created_at AS "createdAt",data->>'contentRevision' AS revision
          FROM ${table("revisions")} r WHERE post_id=p.id ORDER BY created_at DESC,r.id DESC LIMIT 30
        ) h),'[]'::jsonb) AS history
       FROM ${table("posts")} p WHERE p.id=$1 AND p.data->>'deletedAt' IS NULL`,
      [id, committeeMode(user), accessibleCommittees(user, "mediaCalendar")],
    );
    if (!rows.length) throw new CalendarError("Post not found.", 404);
    requirePostAccess(user, rows[0].post);
    return { ...rows[0], members: await membersFor(c, user, rows[0].post) } as {
      members: import("./types").Member[];
      categories: Category[];
      post: Post;
      assets: Asset[];
      pendingUploads: Asset[];
      history: {
        id: string;
        author: string;
        action: string;
        createdAt: string;
        revision: string;
      }[];
    };
  });
}
export async function overview(
  actor: CalendarUser,
  from: string,
  to: string,
  offset = 0,
  owningScope: CommitteeScope = "National",
) {
  return transaction(actor, "view", async (c, user) => {
    const strict = committeeMode(user),
      owned = mayAccessPost(user, { owningScope }, "view"),
      shared = activeMemberships(user).length > 0;
    const scopeSQL = `(NOT $4::boolean OR (COALESCE(data->>'owningScope','National')=$5 AND $6::boolean) OR ($7::boolean AND data->'sharedWith' @> $8::jsonb))`;
    const posts = await c.query(
      `SELECT data FROM ${table("posts")} WHERE data->>'deletedAt' IS NULL AND (planned_at IS NULL OR (planned_at>=$1 AND planned_at<$2)) AND ${scopeSQL} ORDER BY planned_at NULLS LAST,id LIMIT 201 OFFSET $3`,
      [
        from,
        to,
        offset,
        strict,
        owningScope,
        owned,
        shared,
        JSON.stringify([{ userId: String(user.id) }]),
      ],
    );
    const thumbnails = await c.query(
      `SELECT id FROM ${table("assets")} WHERE post_id=ANY($1::uuid[]) AND data->>'thumbnailKey' IS NOT NULL`,
      [posts.rows.map((r) => r.data.id)],
    );
    const previewIds = new Set(thumbnails.rows.map((r) => r.id));
    const categories = await c.query(
      `SELECT data FROM ${table("categories")} WHERE (NOT $1::boolean OR (COALESCE(data->>'owningScope','National')=$2 AND $3::boolean)) AND COALESCE(data->>'owningScope','National')=ANY($4::text[]) ORDER BY data->>'name'`,
      [strict, owningScope, owned,strict?user.accessCatalog?.filter(w=>w.status==="active"&&w.areas.includes("mediaCalendar")).map(w=>w.id)??[]:["National","QLD","NSW","VIC","ACT","SA","WA","TAS","NT"]],
    );
    const notifications = await c.query(
      `SELECT n.id,n.post_id AS "postId",n.message,n.read,n.created_at AS "createdAt",p.data AS post FROM ${table("notifications")} n JOIN ${table("posts")} p ON p.id=n.post_id WHERE n.recipient=$1 AND p.data->>'deletedAt' IS NULL AND (NOT $2::boolean OR COALESCE(p.data->>'owningScope','National')=ANY($3::text[]) OR ($4::boolean AND p.data->'sharedWith' @> $5::jsonb)) ORDER BY n.created_at DESC LIMIT 50`,
      [
        String(user.id),
        strict,
        accessibleCommittees(user, "mediaCalendar"),
        shared,
        JSON.stringify([{ userId: String(user.id) }]),
      ],
    );
    return {
      posts: posts.rows
        .slice(0, 200)
        .filter(({ data: p }: { data: Post }) => mayAccessPost(user, p, "view"))
        .map(({ data: p }: { data: Post }) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          category: p.category,
          plannedAt: p.plannedAt,
          status: p.status,
          onHold: p.onHold,
          version: p.version,
          owner: p.owner,
          owningScope: p.owningScope ?? "National",
          sharedWith: p.sharedWith ?? [],
          thumbnail: p.assets.find((id) => previewIds.has(id)) ?? null,
        })),
      next: posts.rows.length > 200 ? offset + 200 : null,
      categories: categories.rows.map((r) => r.data as Category),
      members: owned ? await membersFor(c, user, { owningScope }) : [],
      notifications: notifications.rows
        .filter((r) => mayAccessPost(user, r.post, "view"))
        .map((r) => ({
          id: r.id,
          postId: r.postId,
          message: r.message,
          read: r.read,
          createdAt: r.createdAt,
        })),
    };
  });
}
export async function saveCategory(
  actor: CalendarUser,
  category: Category,
  create = false,
) {
  return transaction(actor, "edit", async (c, user) => {
    if (committeeMode(user) && !mayManagePost(user, category, "edit"))
      throw new CalendarError(
        "Editing access in this committee is required.",
        403,
      );
    if (!create) {
      const existing = await c.query(
        `SELECT data FROM ${table("categories")} WHERE id=$1 FOR UPDATE`,
        [category.id],
      );
      if (
        existing.rows.length &&
        (existing.rows[0].data.owningScope ?? "National") !==
          (category.owningScope ?? "National")
      )
        throw new CalendarError("Category ownership cannot change.", 403);
    }
    const result = create
      ? await c.query(
          `INSERT INTO ${table("categories")}(id,data) VALUES($1,$2) ON CONFLICT(id) DO NOTHING RETURNING data`,
          [category.id, JSON.stringify(category)],
        )
      : await c.query(
          `UPDATE ${table("categories")} SET data=$2 WHERE id=$1 RETURNING data`,
          [category.id, JSON.stringify(category)],
        );
    if (!result.rows.length) {
      if (create) {
        const existing = await c.query(
          `SELECT data FROM ${table("categories")} WHERE id=$1`,
          [category.id],
        );
        if (
          existing.rows.length &&
          existing.rows[0].data.name === category.name &&
          existing.rows[0].data.color === category.color &&
          existing.rows[0].data.archived === category.archived
        )
          return category;
      }
      throw new CalendarError(
        "This content type changed or was permanently deleted. Refresh the calendar.",
        409,
      );
    }
    return result.rows[0].data as Category;
  });
}
export async function deleteCategory(actor: CalendarUser, id: string) {
  return transaction(actor, "edit", async (c, user) => {
    const result = await c.query(
      `SELECT data FROM ${table("categories")} WHERE id=$1 FOR UPDATE`,
      [id],
    );
    if (!result.rows.length)
      throw new CalendarError("Content type not found.", 404);
    if (!mayManagePost(user, result.rows[0].data, "delete"))
      throw new CalendarError(
        "Editing access in this committee is required.",
        403,
      );
    if (!result.rows[0].data.archived)
      throw new CalendarError("Move this type to Deleted types first.", 409);
    const used = await c.query(
      `SELECT 1 FROM ${table("posts")} WHERE category=$1 LIMIT 1`,
      [id],
    );
    if (used.rows.length)
      throw new CalendarError(
        "This type is attached to posts. Reassign those posts before deleting it permanently.",
        409,
      );
    await c.query(`DELETE FROM ${table("categories")} WHERE id=$1`, [id]);
    return id;
  });
}
export async function readNotification(actor: CalendarUser, id: string) {
  return transaction(actor, "view", async (c, user) => {
    const current = await c.query(
      `SELECT p.data FROM ${table("notifications")} n JOIN ${table("posts")} p ON p.id=n.post_id WHERE n.id=$1 AND n.recipient=$2`,
      [id, String(user.id)],
    );
    if (!current.rows.length)
      throw new CalendarError("Notification not found.", 404);
    requirePostAccess(user, current.rows[0].data);
    await c.query(
      `UPDATE ${table("notifications")} SET read=true WHERE id=$1 AND recipient=$2`,
      [id, String(actor.id)],
    );
  });
}
