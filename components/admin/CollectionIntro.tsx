import Link from "next/link";

import type { BeforeListServerProps } from "payload";

const collectionGuidance: Record<
  string,
  { action: string; description: string; hint?: string; title: string }
> = {
  events: {
    title: "Manage events",
    description: "Add events for MASCA students and review submissions before they appear on the website.",
    hint: "An event appears publicly only after it is approved and published.",
    action: "Add event",
  },
  committee: {
    title: "Manage the committee directory",
    description: "Keep member roles, portraits and department details accurate on the public committee page.",
    action: "Add committee member",
  },
  media: {
    title: "Manage images",
    description: "Upload and organise images that can be reused across the MASCA website.",
    action: "Upload image",
  },
  sponsors: {
    title: "Manage sponsors",
    description: "Keep partner names and logos current in the homepage sponsor marquee.",
    action: "Add sponsor",
  },
  users: {
    title: "Manage CMS access",
    description: "Manage the people who can sign in and update MASCA website content.",
    action: "Add CMS user",
  },
};

export function CollectionIntro({
  collectionSlug,
  hasCreatePermission,
  newDocumentURL,
}: BeforeListServerProps) {
  const guidance = collectionGuidance[collectionSlug];

  if (!guidance) return null;

  return (
    <section className="masca-collection-intro" aria-labelledby={`collection-intro-${collectionSlug}`}>
      <div>
        <p className="masca-collection-intro__eyebrow">MASCA content management</p>
        <h2 id={`collection-intro-${collectionSlug}`}>{guidance.title}</h2>
        <p>{guidance.description}</p>
        {guidance.hint ? <p className="masca-collection-intro__hint">{guidance.hint}</p> : null}
      </div>
      {hasCreatePermission ? (
        <Link className="masca-collection-intro__action" href={newDocumentURL}>
          {guidance.action}
          <span aria-hidden="true"> →</span>
        </Link>
      ) : null}
    </section>
  );
}
