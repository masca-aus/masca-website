export default function AdminLoading() {
  return (
    <main className="masca-admin-loading" role="status" aria-live="polite">
      <div className="masca-admin-loading__heading">
        <span className="masca-admin-loading__mark" aria-hidden="true" />
        <span>Loading CMS page…</span>
      </div>
      <div className="masca-admin-loading__skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
