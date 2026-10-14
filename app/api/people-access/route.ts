import { sameWorkspaceOrigin } from "@/features/access/workspaceOrigin";
import { getPayload, APIError } from "payload";
import config from "@payload-config";
import {
  committeeAccessEnabled,
  withCommitteeMode,
} from "@/features/access/committeeEnvironment";
import {
  managedCommittees,
  listPeople,
} from "@/features/access/delegatedAccess";
import {
  knownWorkspace,
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
function scope(value: unknown, user: CommitteeAccount): CommitteeScope {
  if (typeof value !== "string" || !knownWorkspace(value, user.accessCatalog))
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
        ? { people: await listPeople(user, scope(committee, user)) }
        : {}),
    });
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    if (!sameWorkspaceOrigin(request))
      throw new APIError("Open this action inside the CMS.", 403);
    await actor(request);
    // The old full-membership payload has no revision or explicit renewal intent.
    // Never infer current revisions for a stale caller; the new endpoint owns writes.
    return reply(
      {
        error:
          "Refresh People & access before saving. Use the reviewed workspace access form.",
      },
      409,
    );
  } catch (error) {
    return fail(error);
  }
}
