import { committeeMode } from "../access/committeePolicy.ts";
import { z } from "zod";
import {
  transaction,
  table,
  requirePostAccess,
  calendarAccount,
} from "./repository.ts";
import { calendarSchema } from "./schema.ts";
import { workspaceSchema } from "../access/workspaceEnvironment.ts";
import { mayUseCalendar, mayAccessPost } from "./policy.ts";
import type { CalendarUser, Post } from "./types.ts";
import { CalendarError, idSchema } from "./validation.ts";
export const presenceSchema = z
  .object({
    clientId: idSchema,
    owningScope: z.string().min(1).max(100).optional(),
    cursor: z
      .object({ anchor: z.string().max(1024), head: z.string().max(1024) })
      .nullable(),
    postId: idSchema.nullable().optional(),
    leave: z.boolean().optional(),
    knownRevision: z.number().int().nonnegative().optional(),
  })
  .strict();
export const memberName = (user: Pick<CalendarUser, "email">) =>
  user.email.split("@")[0].replace(/[._]/g, " ");
export const participantColor = (id: string) =>
  ["#367bb5", "#9960bd", "#c16e38", "#2f9073", "#b4517a"][
    Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0) % 5
  ];
/** Ephemeral membership only: expired rows are deleted, never used as a last-seen log. */
export async function syncCollaboration(
  actor: CalendarUser,
  input: z.infer<typeof presenceSchema>,
) {
  return transaction(actor, "view", async (c, user) => {
    const t = `"${calendarSchema()}".presence`;
    await c.query(`DELETE FROM ${t} WHERE expires_at<now()`);
    if (input.leave) {
      await c.query(`DELETE FROM ${t} WHERE client_id=$1 AND user_id=$2`, [
        input.clientId,
        String(user.id),
      ]);
      return { participants: [], post: null };
    }
    let resource: Post | null = null;
    if (input.postId) {
      const r = await c.query(
        `SELECT data FROM ${table("posts")} WHERE id=$1 FOR SHARE`,
        [input.postId],
      );
      if (!r.rows.length) throw new CalendarError("Post not found.", 404);
      resource = r.rows[0].data;
      requirePostAccess(user, resource!);
      // Return a tombstone so an already-open editor can retain local work and close.
      if (r.rows[0].data.deletedAt) {
        await c.query(`DELETE FROM ${t} WHERE client_id=$1 AND user_id=$2`, [
          input.clientId,
          String(user.id),
        ]);
        return {
          post: { ...r.rows[0].data, captionState: undefined } as Omit<
            Post,
            "captionState"
          >,
          participants: [],
        };
      }
    }
    const owningScope =
      resource?.owningScope ?? input.owningScope ?? "National";
    if (!resource && !mayAccessPost(user, { owningScope }, "view"))
      throw new CalendarError(
        "Calendar access in this committee is required.",
        403,
      );
    const result = await c.query(
      `INSERT INTO ${t}(client_id,user_id,post_id,cursor,owning_scope,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '15 seconds') ON CONFLICT(client_id) DO UPDATE SET post_id=$3,cursor=$4,owning_scope=$5,expires_at=now()+interval '15 seconds' WHERE ${t}.user_id=$2 RETURNING client_id`,
      [
        input.clientId,
        String(user.id),
        input.postId ?? null,
        JSON.stringify(input.cursor),
        owningScope,
      ],
    );
    if (!result.rows.length)
      throw new CalendarError("Reconnect to the calendar.", 409);
    const members = await c.query(
      `SELECT p.client_id,p.post_id,p.cursor,u.id,u.email,u.role,u.status,u.calendar_access,u.committee_memberships,u.committee_access_reviewed_at,u.committee_access_reviewed_by,p.owning_scope,post.data AS post_data,ap.version AS photo_version,post.data->>'title' AS post_title FROM ${t} p JOIN "${workspaceSchema()}".users u ON u.id::text=p.user_id LEFT JOIN "${workspaceSchema()}".account_photos ap ON ap.user_id=u.id LEFT JOIN ${table("posts")} post ON post.id=p.post_id AND post.data->>'deletedAt' IS NULL WHERE p.expires_at>now()`,
    );
    let post: (Omit<Post, "captionState"> & { captionState?: string }) | null =
      null;
    if (input.postId) {
      const r = await c.query(
        `SELECT data FROM ${table("posts")} WHERE id=$1`,
        [input.postId],
      );
      if (r.rows.length) {
        const p = r.rows[0].data as Post;
        requirePostAccess(user, p);
        post = {
          ...p,
          captionState:
            input.knownRevision === p.contentRevision
              ? undefined
              : p.captionState,
        };
      }
    }
    return {
      post,
      participants: members.rows
        .filter((r) => {
          const participant = calendarAccount(r,user.accessCatalog);
          if (!committeeMode(user)) return mayUseCalendar(participant, "view");
          if (input.postId)
            return (
              r.post_id === input.postId &&
              !!resource &&
              mayAccessPost(participant, resource, "view")
            );
          return (
            r.owning_scope === owningScope &&
            mayAccessPost(participant, { owningScope }, "view")
          );
        })
        .map((r) => {
          const accessible =
            !!r.post_data &&
            mayAccessPost(user, r.post_data, "view") &&
            mayAccessPost(calendarAccount(r,user.accessCatalog), r.post_data, "view");
          return {
            clientId: r.client_id,
            userId: String(r.id),
            name: memberName(r),
            color: participantColor(String(r.id)),
            postId: accessible ? r.post_id : null,
            postTitle: accessible ? (r.post_title ?? null) : null,
            activity: accessible
              ? r.cursor
                ? "editing"
                : "viewing"
              : "calendar",
            photoVersion: r.photo_version ?? null,
            cursor: accessible && r.post_id === input.postId ? r.cursor : null,
          };
        }),
    };
  });
}
