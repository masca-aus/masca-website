import { actor, reply, fail } from "@/features/access/workspaces/http";
import { sharedAccessRecords } from "@/features/access/workspaces/sharing";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return reply({
      records: await sharedAccessRecords(
        await actor(request),
        new URL(request.url).searchParams.get("workspace") ?? "",
      ),
    });
  } catch (e) {
    return fail(e);
  }
}
