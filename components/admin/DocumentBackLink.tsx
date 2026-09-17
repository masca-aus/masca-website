"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const collectionLabels: Record<string, string> = {
  committee: "Committee",
  events: "Events",
  media: "Media",
  sponsors: "Sponsors",
  users: "Users",
};

export function DocumentBackLink() {
  const pathname = usePathname();
  const collectionSlug = pathname.split("/").at(3);
  const collectionLabel = collectionSlug ? collectionLabels[collectionSlug] : undefined;

  if (!collectionSlug || !collectionLabel) return null;

  return (
    <Link className="masca-document-back-link" href={`/admin/collections/${collectionSlug}`}>
      <span aria-hidden="true">←</span>
      Back to {collectionLabel}
    </Link>
  );
}
