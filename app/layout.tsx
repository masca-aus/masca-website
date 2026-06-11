import type { Metadata } from "next";
import localFont from "next/font/local"
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

import GsapInitializer from "@/utils/GsapInitializer";
import NavBar from "@/components/NavBar";
import WalkingCrowd from "@/components/WalkingCrowd";
import Footer from "@/components/Footer";
import { getCastPeeps } from "@/utils/casts";
import {
  SITE_URL,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_DESCRIPTION,
  SITE_SOCIALS,
} from "@/utils/seo";

// 1. Montserrat (Primary Variable Font - Split into Roman and Italic files)
const montserrat = localFont({
  src: [
    {
      path: "./fonts/Montserrat-VariableFont_wght.ttf",
      style: "normal",
    },
    {
      path: "./fonts/Montserrat-Italic-VariableFont_wght.ttf",
      style: "italic",
    },
  ],
  variable: "--font-montserrat",
   preload: false,
});

// 2. Crimson Text (Secondary Font - Array of all static weight and style files)
const crimsonText = localFont({
  src: [
    {
      path: "./fonts/CrimsonText-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/CrimsonText-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/CrimsonText-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/CrimsonText-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/CrimsonText-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/CrimsonText-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-crimson",
   preload: false,
});

// 3. Brusher (Accent Script Font)
const brusher = localFont({
  src: "./fonts/Brusher.ttf",
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
    siteName: SITE_NAME,
    title: SITE_NAME,
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

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: SITE_NAME,
    alternateName: SITE_SHORT_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description: SITE_DESCRIPTION,
    foundingDate: "2001-04",
    areaServed: "AU",
    sameAs: SITE_SOCIALS,
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
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <GsapInitializer />
        <NavBar />
        {children}
        <Analytics/>
        <WalkingCrowd peeps={peeps} />
        <Footer />
      </body>
    </html>
  );
}
