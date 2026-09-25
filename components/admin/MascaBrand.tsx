/* eslint-disable @next/next/no-img-element -- Payload graphics use static public assets outside Next Image's content pipeline. */

export function MascaLogo() {
  return (
    <div className="masca-admin-logo" aria-label="MASCA CMS">
      <img src="/logo/logo.webp" alt="MASCA" />
      <span>Content Management</span>
    </div>
  );
}

export function MascaMark() {
  return (
    <img
      className="masca-admin-icon"
      src="/logo/logo.webp"
      alt="MASCA"
    />
  );
}

export function MascaIcon() {
  return <span className="masca-admin-home"><span className="masca-admin-home__mark"><MascaMark /></span><span className="masca-admin-home__label">Dashboard</span></span>;
}
