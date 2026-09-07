/* eslint-disable @next/next/no-img-element -- Payload graphics use static public assets outside Next Image's content pipeline. */

export function MascaLogo() {
  return (
    <div className="masca-admin-logo" aria-label="MASCA CMS">
      <img src="/logo/logo.webp" alt="MASCA" />
      <span>Content Management</span>
    </div>
  );
}

export function MascaIcon() {
  return (
    <img
      className="masca-admin-icon"
      src="/logo/logo.webp"
      alt="MASCA"
    />
  );
}
