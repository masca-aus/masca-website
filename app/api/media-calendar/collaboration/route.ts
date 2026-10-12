import { calendarActor, requireOrigin, safeError } from "../route";
import {
  presenceSchema,
  syncCollaboration,
} from "@/features/mediaCalendar/collaboration";
import { CalendarError } from "@/features/mediaCalendar/validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const user = await calendarActor(request),
      raw = await request.text();
    if (raw.length > 3000)
      throw new CalendarError("Cursor update is too large.", 413);
    return Response.json(
      await syncCollaboration(user, presenceSchema.parse(JSON.parse(raw))),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return safeError(e);
  }
}
