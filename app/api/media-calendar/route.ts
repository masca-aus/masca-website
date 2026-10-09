import { getPayload } from "payload";
import config from "@payload-config";
import { z } from "zod";
import { mayUseCalendar } from "@/features/mediaCalendar/policy";
import type { CalendarUser } from "@/features/mediaCalendar/types";
import {
  actionSchema,
  CalendarError,
  idSchema,
  patchSchema,
} from "@/features/mediaCalendar/validation";
import {
  createPost,
  mutatePost,
  overview,
  detail,
  saveCategory,
  readNotification,
} from "@/features/mediaCalendar/repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function calendarActor(request: Request) {
  if (
    process.env.MEDIA_CALENDAR_ENABLED !== "true" ||
    process.env.WORKSPACE_AUTH_ENABLED !== "true"
  )
    throw new CalendarError(
      "The media calendar is not enabled in this workspace.",
      503,
    );
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  const actor = user as unknown as CalendarUser | null;
  if (!actor || !mayUseCalendar(actor, "view"))
    throw new CalendarError(
      "Sign in with an approved media calendar account.",
      403,
    );
  return actor;
}
export function safeError(e: unknown) {
  if (e instanceof CalendarError) return reply({ error: e.message }, e.status);
  if (e instanceof z.ZodError)
    return reply(
      { error: e.issues[0]?.message ?? "Check the form details." },
      400,
    );
  console.error(
    "Media calendar request failed",
    e instanceof Error ? e.message : "unknown",
  );
  return reply(
    {
      error:
        "The calendar is temporarily unavailable. Your unsaved changes are still yours.",
    },
    503,
  );
}
export function requireOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new CalendarError("Open this action inside the CMS.", 403);
}
export async function GET(request: Request) {
  try {
    const user = await calendarActor(request),
      url = new URL(request.url),
      id = url.searchParams.get("id");
    if (id) return reply(await detail(user, idSchema.parse(id)));
    const from = z
        .string()
        .datetime({ offset: true })
        .parse(url.searchParams.get("from")),
      to = z
        .string()
        .datetime({ offset: true })
        .parse(url.searchParams.get("to"));
    if (
      Date.parse(to) <= Date.parse(from) ||
      Date.parse(to) - Date.parse(from) > 63 * 86400000
    )
      throw new CalendarError("Choose a calendar range of 62 days or fewer.");
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(20000)
      .parse(url.searchParams.get("offset") ?? 0);
    return reply(await overview(user, from, to, offset));
  } catch (e) {
    return safeError(e);
  }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const user = await calendarActor(request);
    const raw = await request.text();
    if (raw.length > 200000)
      throw new CalendarError("This update is too large.", 413);
    const data = JSON.parse(raw);
    if (data.action === "create")
      return reply(
        { post: await createPost(user, patchSchema.parse(data.patch ?? {})) },
        201,
      );
    if (data.action === "category") {
      const category = z
        .object({
          id: idSchema,
          name: z.string().trim().min(1).max(50),
          color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          archived: z.boolean(),
        })
        .strict()
        .parse(data.category);
      return reply({ category: await saveCategory(user, category) });
    }
    if (data.action === "notification") {
      await readNotification(user, idSchema.parse(data.id));
      return reply({ ok: true });
    }
    const id = idSchema.parse(data.id);
    const { id: _, ...action } = data;
    void _;
    const post = await mutatePost(user, id, actionSchema.parse(action));
    return reply({ post });
  } catch (e) {
    if (e instanceof SyntaxError)
      return reply({ error: "The update could not be read." }, 400);
    return safeError(e);
  }
}
