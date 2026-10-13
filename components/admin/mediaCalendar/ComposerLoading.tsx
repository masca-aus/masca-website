import { Copy, Download, Send, X } from "lucide-react";

export function CaptionLoading() {
  return (
    <section className="mc-caption" aria-busy="true">
      <div className="mc-section-label">
        <h3>Caption</h3>
        <span role="status">Opening caption…</span>
      </div>
      <div className="mc-presence" aria-hidden="true">
        <div className="mc-loading-line" />
      </div>
      <div className="mc-caption-input">
        <div className="mc-caption-skeleton" />
      </div>
      <div className="mc-caption-meta">
        <small>Named text cursors · changes save automatically</small>
        <span aria-hidden="true">— /2,200</span>
      </div>
    </section>
  );
}

export function PostPanelLoading({
  message = "Creating your draft…",
  error = false,
  onClose,
}: {
  message?: string;
  error?: boolean;
  onClose?: () => void;
}) {
  return (
    <div className="mc-composer-loading" aria-busy={!error}>
      <header className="mc-panel-header">
        <span className="mc-eyebrow">INSTAGRAM · DRAFT</span>
        <button aria-label="Close post" disabled={!onClose} onClick={onClose}>
          <X size={22} />
        </button>
      </header>
      <div className="mc-loading-scroll">
        <p
          className={error ? "mc-error" : "mc-loading-status"}
          role={error ? "alert" : "status"}
        >
          {message}
        </p>
        {!error && (
          <>
            <div className="mc-panel-title" aria-hidden="true">
              <div className="mc-skeleton mc-loading-title" />
              <div className="mc-post-meta">
                {["Planned for", "Content type", "Format"].map((label) => (
                  <div className="mc-loading-field" key={label}>
                    <span>{label}</span>
                    <div className="mc-skeleton mc-loading-control" />
                  </div>
                ))}
              </div>
              <small className="mc-muted">
                Australia/Brisbane · AEST · planned date only
              </small>
              <div className="mc-calendar-export">
                <div className="mc-skeleton mc-loading-calendar" />
                <small className="mc-muted">Add to calendar</small>
              </div>
            </div>
            <div className="mc-panel-body">
              <div className="mc-compose">
                <section className="mc-media">
                  <div className="mc-section-label">
                    <h3>Media</h3>
                  </div>
                  <div
                    className="mc-skeleton mc-loading-media"
                    aria-hidden="true"
                  />
                  <div className="mc-attachments" aria-hidden="true" />
                </section>
                <CaptionLoading />
              </div>
              <aside>
                <section className="mc-preview">
                  <div className="mc-section-label">
                    <h3>Instagram preview</h3>
                  </div>
                  <div className="mc-instagram" aria-hidden="true">
                    <header>
                      <div className="mc-skeleton mc-loading-avatar" />
                      <div className="mc-skeleton mc-loading-line" />
                    </header>
                    <div className="mc-instagram-image" />
                    <div className="mc-loading-preview-footer">
                      <div className="mc-skeleton mc-loading-line" />
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
      {!error && (
        <footer className="mc-panel-footer">
          <div>
            <button disabled>
              <Copy size={16} />
              Copy caption
            </button>
            <button disabled>
              <Download size={16} />
              Download media
            </button>
            <button disabled>
              <Copy size={15} />
              Duplicate
            </button>
          </div>
          <div>
            <button className="mc-primary" disabled>
              <Send size={16} />
              Request review
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
