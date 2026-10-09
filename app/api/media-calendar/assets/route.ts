import { z } from "zod";
import { calendarActor, requireOrigin, safeError } from "../route";
import { idSchema, CalendarError } from "@/features/mediaCalendar/validation";
import {
  initUpload,
  finishUpload,
  assetURL,
  cancelUpload,
} from "@/features/mediaCalendar/assets";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await calendarActor(request),
      url = new URL(request.url),
      id = idSchema.parse(url.searchParams.get("id"));
    const signed = await assetURL(
      user,
      id,
      url.searchParams.get("download") === "true",
      url.searchParams.get("thumbnail") === "true",
    );
    return new Response(null, {
      status: 302,
      headers: { Location: signed, "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return safeError(e);
  }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const user = await calendarActor(request),
      raw = await request.text();
    if (raw.length > 2000)
      throw new CalendarError("Upload details are too large.", 413);
    const d = JSON.parse(raw);
    if (d.action === "init") {
      const v = z
        .object({
          postId: idSchema,
          name: z.string().max(240),
          mime: z.string().max(80),
          size: z.number().int().positive(),
        })
        .parse(d);
      return Response.json(
        await initUpload(user, v.postId, v.name, v.mime, v.size),
      );
    }
    if (d.action === "cancel") {
      await cancelUpload(user, idSchema.parse(d.id));
      return Response.json({ ok: true });
    }
    if (d.action === "finish")
      return Response.json({
        post: await finishUpload(
          user,
          idSchema.parse(d.id),
          z.number().int().positive().parse(d.expectedVersion),
        ),
      });
    throw new CalendarError("Unknown upload action.");
  } catch (e) {
    return safeError(e);
  }
}
