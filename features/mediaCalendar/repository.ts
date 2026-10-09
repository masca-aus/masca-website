import pg from "pg";
import { randomUUID } from "node:crypto";
import { calendarSchema } from "./schema.ts";
import { workspaceSchema } from "../access/workspaceEnvironment.ts";
import { mayUseCalendar } from "./policy.ts";
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
    const { rows } = await c.query(
      `SELECT id,email,status,role,calendar_access FROM "${workspaceSchema()}".users WHERE id=$1`,
      [actor.id],
    );
    const row = rows[0],
      user = row
        ? { ...actor, ...row, calendarAccess: row.calendar_access }
        : null;
    if (!mayUseCalendar(user, capability))
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
) {
  if (p.category) {
    const r = await c.query(
      `SELECT data FROM ${table("categories")} WHERE id=$1`,
      [p.category],
    );
    if (!r.rows.length) throw new CalendarError("Choose an existing category.");
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
      `SELECT id,email,status,role,calendar_access FROM "${workspaceSchema()}".users WHERE id::text=ANY($1::text[])`,
      [people],
    );
    if (
      rows.length !== people.length ||
      rows.some(
        (r) =>
          !mayUseCalendar({ ...r, calendarAccess: r.calendar_access }, "view"),
      )
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
      `SELECT id,email,status,role,calendar_access FROM "${workspaceSchema()}".users`,
    );
    recipients = r.rows
      .filter(
        (r) =>
          mayUseCalendar(
            { ...r, calendarAccess: r.calendar_access },
            "approve",
          ) && !p.contributors.includes(String(r.id)),
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
  for (const recipient of new Set(
    recipients.filter((r) => r !== String(user.id)),
  ))
    await c.query(
      `INSERT INTO ${table("notifications")}(id,recipient,post_id,message) VALUES($1,$2,$3,$4)`,
      [randomUUID(), recipient, p.id, message],
    );
}
export async function createPost(actor: CalendarUser, input: unknown) {
  return transaction(actor, "edit", async (c, user) => {
    const p = newPost(user, input);
    await checkRelations(c, p);
    await savePost(c, p);
    await checkpoint(c, p, user, "create");
    return p;
  });
}
export async function mutatePost(actor: CalendarUser, id: string, a: Action) {
  return transaction(actor, "view", async (c, user) => {
    const p = await lockedPost(c, id, a.action === "restore");
    if (a.action === "duplicate") {
      if (a.expectedRevision !== p.contentRevision)
        throw new CalendarError(
          "The content changed. Reopen the post before duplicating.",
          409,
        );
      const copy = newPost(user, {
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
  return transaction(actor, "view", async (c) => {
    const p = await lockedPost(c, id);
    const assets = await c.query(
      `SELECT data FROM ${table("assets")} WHERE post_id=$1 AND id=ANY($2::uuid[])`,
      [id, p.assets],
    );
    const pending = await c.query(
      `SELECT data FROM ${table("assets")} WHERE post_id=$1 AND data->>'ready'='false' AND COALESCE(data->>'cancelled','false')='false' AND (data->>'createdAt')::timestamptz>now()-interval '1 day'`,
      [id],
    );
    const history = await c.query(
      `SELECT id,author,action,created_at AS "createdAt",data->>'contentRevision' AS revision FROM ${table("revisions")} WHERE post_id=$1 ORDER BY created_at DESC LIMIT 30`,
      [id],
    );
    return {
      post: p,
      assets: assets.rows.map((r) => r.data as Asset),
      pendingUploads: pending.rows.map((r) => r.data as Asset),
      history: history.rows,
    };
  });
}
export async function overview(
  actor: CalendarUser,
  from: string,
  to: string,
  offset = 0,
) {
  return transaction(actor, "view", async (c) => {
    const posts = await c.query(
      `SELECT data FROM ${table("posts")} WHERE data->>'deletedAt' IS NULL AND (planned_at IS NULL OR (planned_at>=$1 AND planned_at<$2)) ORDER BY planned_at NULLS LAST,id LIMIT 201 OFFSET $3`,
      [from, to, offset],
    );
    const thumbnails = await c.query(
      `SELECT id FROM ${table("assets")} WHERE post_id=ANY($1::uuid[]) AND data->>'thumbnailKey' IS NOT NULL`,
      [posts.rows.map((r) => r.data.id)],
    );
    const previewIds = new Set(thumbnails.rows.map((r) => r.id));
    const categories = await c.query(
      `SELECT data FROM ${table("categories")} ORDER BY data->>'name'`,
    );
    const members = await c.query(
      `SELECT id,email,status,role,calendar_access FROM "${workspaceSchema()}".users`,
    );
    const notifications = await c.query(
      `SELECT id,post_id AS "postId",message,read,created_at AS "createdAt" FROM ${table("notifications")} WHERE recipient=$1 ORDER BY created_at DESC LIMIT 50`,
      [String(actor.id)],
    );
    return {
      posts: posts.rows.slice(0, 200).map(({ data: p }: { data: Post }) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        category: p.category,
        plannedAt: p.plannedAt,
        status: p.status,
        onHold: p.onHold,
        version: p.version,
        owner: p.owner,
        thumbnail: p.assets.find((id) => previewIds.has(id)) ?? null,
      })),
      next: posts.rows.length > 200 ? offset + 200 : null,
      categories: categories.rows.map((r) => r.data as Category),
      members: members.rows
        .filter((r) =>
          mayUseCalendar({ ...r, calendarAccess: r.calendar_access }, "view"),
        )
        .map((r) => ({
          id: String(r.id),
          name: r.email.split("@")[0].replace(/[._]/g, " "),
          edit: mayUseCalendar(
            { ...r, calendarAccess: r.calendar_access },
            "edit",
          ),
          approve: mayUseCalendar(
            { ...r, calendarAccess: r.calendar_access },
            "approve",
          ),
        })),
      notifications: notifications.rows,
    };
  });
}
export async function saveCategory(actor: CalendarUser, category: Category) {
  return transaction(actor, "edit", async (c) => {
    await c.query(
      `INSERT INTO ${table("categories")}(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=$2`,
      [category.id, JSON.stringify(category)],
    );
    return category;
  });
}
export async function readNotification(actor: CalendarUser, id: string) {
  return transaction(actor, "view", async (c) => {
    await c.query(
      `UPDATE ${table("notifications")} SET read=true WHERE id=$1 AND recipient=$2`,
      [id, String(actor.id)],
    );
  });
}
