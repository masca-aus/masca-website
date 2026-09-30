import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { beginGoogleLogin, googleSettings } from "@/features/access/googleOIDC";
export const dynamic = "force-dynamic";
export async function GET() {
  if (process.env.WORKSPACE_AUTH_ENABLED !== "true")
    return new Response("Not available", { status: 404 });
  const payload = await getPayload({ config });
  const { url, transaction } = await beginGoogleLogin(payload.secret);
  const response = NextResponse.redirect(url);
  response.cookies.set("masca-google-flow", transaction, {
    httpOnly: true,
    secure: googleSettings().origin.startsWith("https:"),
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
