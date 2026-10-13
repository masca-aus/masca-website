import { timingSafeEqual } from "node:crypto";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  generateTermReminders,
  termReminders,
} from "@/features/access/committeeReminders";
import type { CommitteeAccount } from "@/features/access/committeePolicy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  try {
    const cron = process.env.CRON_SECRET,
      auth = request.headers.get("authorization") ?? "";
    if (
      cron &&
      auth.length === `Bearer ${cron}`.length &&
      timingSafeEqual(Buffer.from(auth), Buffer.from(`Bearer ${cron}`))
    )
      return Response.json(await generateTermReminders(), { headers });
    const payload = await getPayload({ config }),
      { user } = await payload.auth({ headers: request.headers });
    if (!user)
      return Response.json(
        { error: "Sign in to your MASCA account." },
        { status: 401, headers },
      );
    return Response.json(
      { reminders: await termReminders(user as unknown as CommitteeAccount) },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Term reminders could not load." },
      { status: 503, headers },
    );
  }
}
