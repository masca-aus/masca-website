export default function Loading() {
  return (
    <div className="masca-admin-loading" role="status" aria-live="polite">
      <span className="masca-admin-loading__bar" aria-hidden="true" />
      <span className="sr-only">Preparing your workspace</span>
    </div>
  );
}
