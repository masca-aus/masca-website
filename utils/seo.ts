import type { Metadata } from "next";

/**
 * Single source of truth for site-wide SEO values.
 *
 * NOTE: SITE_URL is the canonical production origin. It drives canonical
 * URLs, Open Graph URLs, the sitemap and robots.txt. If the live site is
 * served from a different host (e.g. the apex `https://masca.org.au`
 * instead of `www`), change it here only.
 */
export const SITE_URL = "https://www.masca.org.au";
export const SITE_NAME = "Malaysian Students' Council of Australia";
export const SITE_SHORT_NAME = "MASCA";
export const SITE_DESCRIPTION =
  "The Malaysian Students' Council of Australia (MASCA) is the official, peak student representative body for Malaysian students in Australia. Established in April 2001, it operates as a non-profit organization across six states and one territory to advocate for students' welfare, promote academic excellence, and celebrate Malaysian culture.";

export const SITE_SOCIALS = [
  "https://www.instagram.com/masca_national/",
  "https://www.facebook.com/nationalmasca",
  "https://x.com/masca_national/",
  "https://www.linkedin.com/company/masca-amplifies/",
];

type PageMetaInput = {
  /** Page title without the "| MASCA" suffix; the template adds it. */
  title: string;
  description: string;
  /** Absolute path beginning with "/" (e.g. "/events"). */
  path: string;
};

/**
 * Builds a complete per-page Metadata object: title, description, canonical
 * URL, Open Graph and Twitter cards.
 *
 * In the App Router, nested `openGraph`/`twitter`/`alternates` from a page
 * fully REPLACE the layout's, so each page must carry the full set — hence
 * this helper, which keeps siteName/type/locale/image consistent everywhere.
 */
export function pageMetadata({
  title,
  description,
  path,
}: PageMetaInput): Metadata {
  const titleWithBrand = `${title} | ${SITE_SHORT_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: titleWithBrand,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_AU",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titleWithBrand,
      description,
    },
  };
}
