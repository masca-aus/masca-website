export function LoginWelcome() {
  return (
    <div className="masca-login-welcome">
      <span className="masca-login-eyebrow">YOUR COMMITTEE WORKSPACE</span>
      <h1>Welcome back.</h1>
      <p>
        One place to keep MASCA connected. Sign in to manage your website
        content.
      </p>
      <div className="masca-login-collections" aria-label="Website content">
        <span>Events</span>
        <span>Careers</span>
        <span>Committee</span>
        <span>Sponsors</span>
      </div>
    </div>
  );
}
export function LoginHelp() {
  return (
    <div className="masca-login-help">
      <p>Need an account? Contact the MASCA Digital team for access.</p>
      <a href="/">← Back to MASCA website</a>
    </div>
  );
}
