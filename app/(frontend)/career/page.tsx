import type { Metadata } from "next";

import { pageMetadata } from "@/utils/seo";
import UnderConstruction from "@/components/UnderConstruction";

export const metadata: Metadata = pageMetadata({
  title: "Career",
  description:
    "MASCA Careers is in the works. Check back soon — or head home in the meantime.",
  path: "/career",
});

export default function CareerPage() {
  return <UnderConstruction />;
}
