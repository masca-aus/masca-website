import type { Metadata } from "next";
import localFont from "next/font/local"
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import GsapInitializer from "@/utils/GsapInitializer";
import NavBar from "@/components/NavBar";
import WalkingCrowd from "@/components/WalkingCrowd";
import Footer from "@/components/Footer";
import { getCastPeeps } from "@/utils/casts";
import {
  SITE_URL,
  SITE_NAME,
  SITE_NAME_FULL,
  SITE_SHORT_NAME,
  SITE_DESCRIPTION,
  SITE_SOCIALS,
  SITE_NAV,
} from "@/utils/seo";

// 1. Montserrat (Primary Variable Font - Split into Roman and Italic files)
const montserrat = localFont({
  src: [
    {
      path: "./fonts/Montserrat-VariableFont_wght.woff2",
      style: "normal",
    },
    {
      path: "./fonts/Montserrat-Italic-VariableFont_wght.woff2",
      style: "italic",
    },
  ],
  variable: "--font-montserrat",
  // Body font: preload so it downloads immediately and the FOUT swap window
  // stays short even on slow connections.
  preload: true,
});

// 2. Crimson Text (Secondary Font - Array of all static weight and style files)
const crimsonText = localFont({
  src: [
    {
      path: "./fonts/CrimsonText-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/CrimsonText-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/CrimsonText-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/CrimsonText-SemiBoldItalic.woff2",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/CrimsonText-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/CrimsonText-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-crimson",
   preload: false,
});

// 3. Brusher (Accent Script Font)
const brusher = localFont({
  src: "./fonts/Brusher.woff2",
  variable: "--font-brusher",
   preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_SHORT_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_SHORT_NAME,
  keywords: [
    "MASCA",
    "Malaysian Students' Council of Australia",
    "Malaysian students Australia",
    "Malaysian student association",
    "Malaysian society Australia",
    "international students Australia",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME_FULL,
    title: SITE_NAME_FULL,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const peeps = getCastPeeps();

  // One @graph holding two linked entities:
  //  - WebSite  → drives the site name Google renders for the homepage. Its
  //    single `name` is the full form with the acronym baked in, so the only
  //    site name Google can show is the complete title. We deliberately do NOT
  //    give the WebSite an `alternateName: "MASCA"`, which would invite Google
  //    to display the bare acronym.
  //  - Organization (NGO) → the entity for the Knowledge Graph. Here the
  //    `alternateName: "MASCA"` is correct and useful for entity recognition.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME_FULL,
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-AU",
      },
      {
        "@type": "NGO",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: SITE_SHORT_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
        description: SITE_DESCRIPTION,
        foundingDate: "2001-04",
        areaServed: "AU",
        sameAs: SITE_SOCIALS,
      },
      // Main navigation hint: exposes the key sections to crawlers. Mirrors the
      // visible header (components/NavBar.tsx). A hint only — sitelinks remain
      // algorithmic and cannot be forced by markup.
      ...SITE_NAV.map((item, i) => ({
        "@type": "SiteNavigationElement",
        "@id": `${SITE_URL}/#nav-${i + 1}`,
        position: i + 1,
        name: item.name,
        url: `${SITE_URL}${item.path}`,
      })),
    ],
  };

  return (
    <html
      lang="en-AU"
      className={`${montserrat.variable} ${crimsonText.variable} ${brusher.variable} antialiased`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
        <GsapInitializer />
        {/* Keyboard users can jump past the navbar; visible only while focused. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
        >
          Skip to content
        </a>
        <NavBar />
        {children}
        <Analytics/>
        <SpeedInsights />
        <WalkingCrowd peeps={peeps} />
        <Footer />
      </body>
    </html>
  );
}
