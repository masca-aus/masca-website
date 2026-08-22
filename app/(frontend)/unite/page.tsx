import type { Metadata } from "next";

import { pageMetadata } from "@/utils/seo";
import UnderConstruction from "@/components/UnderConstruction";

export const metadata: Metadata = pageMetadata({
  title: "Unite",
  description:
    "MASCA Unites is in the works. Check back soon — or head home in the meantime.",
  path: "/unite",
});

export default function UnitePage() {
  return <UnderConstruction />;
}
