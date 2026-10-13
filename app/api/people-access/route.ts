import { getPayload, APIError } from "payload";
import config from "@payload-config";
import {
  committeeAccessEnabled,
  withCommitteeMode,
} from "@/features/access/committeeEnvironment";
import {
  managedCommittees,
  listPeople,
  saveMembership,
} from "@/features/access/delegatedAccess";
import {
  committeeScopes,
  type CommitteeAccount,
  type CommitteeScope,
} from "@/features/access/committeePolicy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
async function actor(request: Request) {
  if (
    !committeeAccessEnabled() ||
    process.env.WORKSPACE_AUTH_ENABLED !== "true"
  )
    throw new APIError("Committee access is not enabled.", 403);
  const payload = await getPayload({ config }),
    { user } = await payload.auth({ headers: request.headers });
  if (!user) throw new APIError("Sign in to manage committee access.", 401);
  return withCommitteeMode(user as unknown as CommitteeAccount);
}
function scope(value: unknown): CommitteeScope {
  if (
    typeof value !== "string" ||
    !committeeScopes.includes(value as CommitteeScope)
  )
    throw new APIError("Choose a committee.", 400);
  return value as CommitteeScope;
}
function fail(error: unknown) {
  return reply(
    {
      error:
        error instanceof APIError
          ? error.message
          : "Access could not be saved. Please try again.",
    },
    error instanceof APIError ? error.status : 500,
  );
}
export async function GET(request: Request) {
  try {
    const user = await actor(request),
      committee = new URL(request.url).searchParams.get("committee");
    return reply({
      committees: managedCommittees(user),
      ...(committee
        ? { people: await listPeople(user, scope(committee)) }
        : {}),
    });
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new APIError("Open this action inside the CMS.", 403);
    const user = await actor(request),
      data = await request.json();
    if (
      !data ||
      typeof data !== "object" ||
      Object.keys(data).some(
        (k) => !["targetId", "email", "committee", "membership"].includes(k),
      )
    )
      throw new APIError(
        "Only one committee membership can be changed here.",
        400,
      );
    if (
      data.targetId !== undefined &&
      (typeof data.targetId !== "string" || !/^\d+$/.test(data.targetId))
    )
      throw new APIError("Choose a valid person.", 400);
    if (data.email !== undefined && typeof data.email !== "string")
      throw new APIError("Choose a valid email.", 400);
    return reply(
      await saveMembership(user, { ...data, committee: scope(data.committee) }),
    );
  } catch (error) {
    return fail(error);
  }
}
