import type { Metadata } from "next";

import UnderConstruction from "@/components/UnderConstruction";
import { pageMetadata } from "@/utils/seo";

export const metadata: Metadata = pageMetadata({
  title: "Events",
  description:
    "Malaysian student events across Australia — every chapter, every month, all in one place. Filter by state to find what's happening near you.",
  path: "/events",
});

export default function EventPage() {
  return (
    <main id="main">
      <UnderConstruction />
    </main>
  );
}
