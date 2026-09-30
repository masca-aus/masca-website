import { sql } from "@payloadcms/db-postgres";
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import {
  finishGoogleLogin,
  googleSettings,
} from "@/features/access/googleOIDC";
import {
  approvedGoogleIdentity,
  normalizedEmail,
  type ApprovedAccount,
} from "@/features/access/workspacePolicy";
import { signWorkspaceSession } from "@/features/access/workspaceSession";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  if (process.env.WORKSPACE_AUTH_ENABLED !== "true")
    return new Response("Not available", { status: 404 });
  const settings = googleSettings();
  let response: NextResponse;
  try {
    const payload = await getPayload({ config });
    const identity = await finishGoogleLogin(
      request.nextUrl.searchParams.get("code") ?? "",
      request.nextUrl.searchParams.get("state") ?? "",
      request.cookies.get("masca-google-flow")?.value ?? "",
      payload.secret,
    );
    const result = await payload.find({
      collection: "users",
      where: { email: { equals: normalizedEmail(identity.email) } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    });
    const account = result.docs[0] as unknown as ApprovedAccount & {
      id: number;
      sessionRevision: string;
    };
    if (!approvedGoogleIdentity(account, identity) || !account.sessionRevision)
      throw new Error("Access not approved");
    // A single conditional SQL update prevents a concurrent suspension or identity
    // binding from being overwritten between approval lookup and first login.
    const bound = await payload.db.drizzle.execute(sql`
      UPDATE "cms_auth_preview"."users"
      SET google_subject = ${identity.sub}, status = 'active', updated_at = NOW()
      WHERE id = ${account.id} AND session_revision = ${account.sessionRevision}
        AND status IN ('invited','active')
        AND (google_subject IS NULL OR google_subject = ${identity.sub})
      RETURNING id
    `);
    if (!bound.rows.length) throw new Error("Approval changed during sign-in");
    const token = await signWorkspaceSession(
      account.id,
      account.sessionRevision,
      payload.secret,
    );
    response = NextResponse.redirect(`${settings.origin}/admin`);
    response.cookies.set(`${payload.config.cookiePrefix}-token`, token, {
      httpOnly: true,
      secure: settings.origin.startsWith("https:"),
      sameSite: "lax",
      path: "/",
      maxAge: 28800,
    });
  } catch {
    response = NextResponse.redirect(
      `${settings.origin}/admin/login?googleError=access`,
    );
  }
  response.cookies.set("masca-google-flow", "", {
    httpOnly: true,
    secure: settings.origin.startsWith("https:"),
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
