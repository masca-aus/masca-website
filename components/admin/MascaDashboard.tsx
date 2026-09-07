import Link from "next/link";

const contentAreas = [
  {
    name: "Committee",
    description: "Manage committee members, portraits, roles and departments.",
    href: "/admin/collections/committee",
    createHref: "/admin/collections/committee/create",
    action: "Add member",
    accent: "blue",
    icon: "people",
  },
  {
    name: "Media",
    description: "Upload and organise the images used throughout the website.",
    href: "/admin/collections/media",
    createHref: "/admin/collections/media/create",
    action: "Upload image",
    accent: "yellow",
    icon: "image",
  },
  {
    name: "Sponsors",
    description: "Keep partner names, logos and sponsorship dates up to date.",
    href: "/admin/collections/sponsors",
    createHref: "/admin/collections/sponsors/create",
    action: "Add sponsor",
    accent: "red",
    icon: "star",
  },
] as const;

export function MascaDashboard() {
  return (
    <main className="masca-dashboard">
      <section className="masca-dashboard__hero">
        <div className="masca-dashboard__hero-copy">
          <span className="masca-dashboard__eyebrow">MASCA Content Management</span>
          <h1>Welcome back.</h1>
          <p>
            Keep the national website accurate, current and useful for Malaysian
            students across Australia.
          </p>
        </div>

        <Link className="masca-dashboard__site-link" href="/" target="_blank">
          View website <ArrowIcon />
        </Link>
      </section>

      <section className="masca-dashboard__section" aria-labelledby="manage-content">
        <div className="masca-dashboard__section-heading">
          <div>
            <span className="masca-dashboard__eyebrow">Content</span>
            <h2 id="manage-content">Manage the website</h2>
          </div>
          <p>Choose an area to review existing content or add something new.</p>
        </div>

        <div className="masca-dashboard__cards">
          {contentAreas.map((area) => (
            <article
              className="masca-dashboard__card"
              data-accent={area.accent}
              key={area.name}
            >
              <div className="masca-dashboard__card-icon" aria-hidden="true">
                <AreaIcon name={area.icon} />
              </div>
              <div className="masca-dashboard__card-copy">
                <h3>{area.name}</h3>
                <p>{area.description}</p>
              </div>
              <div className="masca-dashboard__card-actions">
                <Link href={area.href}>Manage</Link>
                <Link className="masca-dashboard__add-link" href={area.createHref}>
                  <PlusIcon /> {area.action}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="masca-dashboard__admin" aria-labelledby="administration">
        <div>
          <span className="masca-dashboard__eyebrow">Administration</span>
          <h2 id="administration">CMS access</h2>
          <p>Manage the people who can sign in to this dashboard.</p>
        </div>
        <Link href="/admin/collections/users">Manage users <ArrowIcon /></Link>
      </section>
    </main>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function AreaIcon({ name }: { name: (typeof contentAreas)[number]["icon"] }) {
  if (name === "people") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="17" cy="9" r="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3.5 19c.4-4 2.3-6 5.5-6s5.1 2 5.5 6M14 14c3.4-.7 5.6 1 6 4" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (name === "image") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="m5 18 5-5 3.5 3 2.5-2 3 4" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
