import { z } from "zod";
import { transaction, table } from "./repository.ts";
import { calendarSchema } from "./schema.ts";
import { workspaceSchema } from "../access/workspaceEnvironment.ts";
import { mayUseCalendar } from "./policy.ts";
import type { CalendarUser, Post } from "./types.ts";
import { CalendarError, idSchema } from "./validation.ts";
export const presenceSchema = z
  .object({
    clientId: idSchema,
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
    if (input.postId) {
      const r = await c.query(`SELECT id FROM ${table("posts")} WHERE id=$1`, [
        input.postId,
      ]);
      if (!r.rows.length) throw new CalendarError("Post not found.", 404);
    }
    const result = await c.query(
      `INSERT INTO ${t}(client_id,user_id,post_id,cursor,expires_at) VALUES($1,$2,$3,$4,now()+interval '15 seconds') ON CONFLICT(client_id) DO UPDATE SET post_id=$3,cursor=$4,expires_at=now()+interval '15 seconds' WHERE ${t}.user_id=$2 RETURNING client_id`,
      [
        input.clientId,
        String(user.id),
        input.postId ?? null,
        JSON.stringify(input.cursor),
      ],
    );
    if (!result.rows.length)
      throw new CalendarError("Reconnect to the calendar.", 409);
    const members = await c.query(
      `SELECT p.client_id,p.post_id,p.cursor,u.id,u.email,u.role,u.status,u.calendar_access FROM ${t} p JOIN "${workspaceSchema()}".users u ON u.id::text=p.user_id WHERE p.expires_at>now()`,
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
        .filter((r) =>
          mayUseCalendar({ ...r, calendarAccess: r.calendar_access }, "view"),
        )
        .map((r) => ({
          clientId: r.client_id,
          userId: String(r.id),
          name: memberName(r),
          color: participantColor(String(r.id)),
          postId: r.post_id,
          cursor: r.post_id === input.postId ? r.cursor : null,
        })),
    };
  });
}
