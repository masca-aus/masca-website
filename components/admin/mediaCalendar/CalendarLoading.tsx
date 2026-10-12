/** List placeholders reserve space while the first overview request is pending. */
export function CalendarLoading() {
  return (
    <div
      className="mc-loading-shell"
      role="status"
      aria-label="Loading calendar"
    >
      <span className="mc-loading-label">Loading your calendar…</span>
      <div className="mc-list mc-list-loading" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <section key={i}>
            <div className="mc-loading-line" />
            <div className="mc-loading-card">
              <i />
              <i />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
