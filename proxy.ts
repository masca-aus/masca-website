import { type NextRequest, NextResponse } from "next/server";

const ADMIN_THEME_COOKIE = "payload-theme";

export function proxy(request: NextRequest) {
  if (request.cookies.has(ADMIN_THEME_COOKIE)) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  const existingCookies = requestHeaders.get("cookie");
  requestHeaders.set(
    "cookie",
    [existingCookies, `${ADMIN_THEME_COOKIE}=light`].filter(Boolean).join("; "),
  );

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(ADMIN_THEME_COOKIE, "light", {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

export const config = {
  matcher: "/admin/:path*",
};
