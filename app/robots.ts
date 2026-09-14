import type { MetadataRoute } from "next";

import { SITE_URL } from "@/utils/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Plain-text sheet health report for the Careers committee.
      disallow: "/careers/health",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
