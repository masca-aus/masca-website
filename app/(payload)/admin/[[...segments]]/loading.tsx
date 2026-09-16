export default function AdminLoading() {
  return (
    <main className="masca-admin-loading masca-admin-loading--document" role="status" aria-live="polite">
      <span className="masca-admin-loading__bar" aria-hidden="true" />
      <span className="sr-only">Preparing your workspace</span>
      <div className="masca-admin-loading__title" aria-hidden="true">
        <span className="masca-admin-loading__eyebrow" />
        <span className="masca-admin-loading__headline" />
      </div>
      <div className="masca-admin-loading__form" aria-hidden="true">
        <span className="masca-admin-loading__field masca-admin-loading__field--wide" />
        <span className="masca-admin-loading__field" />
        <span className="masca-admin-loading__field" />
        <span className="masca-admin-loading__field masca-admin-loading__field--wide" />
      </div>
    </main>
  );
}
