/** Framework request URLs can use an internal host; the configured CMS origin is authoritative. */
export function sameWorkspaceOrigin(
  request: Request,
  configured = process.env.GOOGLE_AUTH_ORIGIN,
) {
  try {
    return (
      request.headers.get("origin") ===
      (configured ? new URL(configured).origin : new URL(request.url).origin)
    );
  } catch {
    return false;
  }
}
