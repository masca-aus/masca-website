import Link from "next/link";

export function LoginWelcome({
  searchParams,
}: {
  searchParams?: Record<string, string>;
}) {
  return (
    <div className="masca-login-welcome">
      <h1>Sign in to MASCA</h1>
      <p>Your committee workspace.</p>
      {process.env.WORKSPACE_AUTH_ENABLED === "true" && (
        <>
          {searchParams?.googleError && (
            <p role="alert">
              Sign-in wasn’t completed. Use an approved MASCA account or contact
              the Digital team.
            </p>
          )}
          {/* OAuth starts with a full navigation; prefetching must not create a login transaction. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            className="masca-google-signin masca-action masca-action--primary"
            href="/api/auth/google/start"
          >
            Continue with Google
          </a>
        </>
      )}
    </div>
  );
}
export function LoginHelp() {
  return (
    <div className="masca-login-help">
      <p>Need access? Contact the Digital team.</p>
      <Link href="/">← Back to MASCA website</Link>
    </div>
  );
}
