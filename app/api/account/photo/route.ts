import { getPayload } from "payload";
import config from "@payload-config";
import { isWorkspaceEmail } from "@/features/access/workspacePolicy";
import {
  AccountPhotoError,
  normaliseAccountPhoto,
  readPhotoUpload,
} from "@/features/account/photo";
import {
  accountPhotoInfo,
  readAccountPhoto,
  saveAccountPhoto,
  type PhotoActor,
} from "@/features/account/photoRepository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
async function actor(request: Request) {
  if (process.env.WORKSPACE_AUTH_ENABLED !== "true")
    throw new AccountPhotoError("Account photos are unavailable.", 503);
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  const current = user as unknown as PhotoActor | null;
  if (
    !current ||
    current.status !== "active" ||
    !isWorkspaceEmail(current.email)
  )
    throw new AccountPhotoError("Sign in to your MASCA account.", 401);
  return current;
}
function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new AccountPhotoError("Open this action inside the CMS.", 403);
}
function failure(error: unknown) {
  if (error instanceof AccountPhotoError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers },
    );
  console.error(
    "Account photo request failed",
    error instanceof Error ? error.name : "unknown",
  );
  return Response.json(
    { error: "Your photo could not be saved. Please try again." },
    { status: 503, headers },
  );
}
export async function GET(request: Request) {
  try {
    const user = await actor(request),
      url = new URL(request.url);
    if (url.searchParams.get("info") === "true")
      return Response.json(await accountPhotoInfo(user), { headers });
    const result = await readAccountPhoto(
      user,
      url.searchParams.get("id") ?? String(user.id),
    );
    return new Response(new Uint8Array(result.photo), {
      headers: { ...headers, "Content-Type": "image/webp" },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await actor(request);
    const photo = await normaliseAccountPhoto(
      await readPhotoUpload(request),
      request.headers.get("content-type")?.split(";")[0] ?? "",
    );
    return Response.json(await saveAccountPhoto(user, photo), { headers });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    return Response.json(await saveAccountPhoto(await actor(request), null), {
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
