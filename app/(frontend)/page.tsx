import type { Metadata } from "next";

import { SITE_NAME_FULL, SITE_DESCRIPTION } from "@/utils/seo";
import HeroSection from "./sections/hero";
import EventShowcaseSection from "./sections/eventShowcase";
import MascaCareSection from "./sections/mascaCare";
import CareerSpotlightSection from "./sections/careerSpotlight";
import MascaVoiceSection from "./sections/mascaVoice";
import YearbookSection from "./sections/yearbook";
import AboutSection from "./sections/about";
import SponsorsSection from "./sections/sponsors";
import FollowUsSection from "./sections/followUs";
import PostOnOurPageSection from "./sections/postOnOurPage";
import { getSponsors } from "@/utils/sponsors";

// Refresh time-based event expiry between editor-triggered revalidations.
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: SITE_NAME_FULL },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME_FULL,
    title: SITE_NAME_FULL,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME_FULL,
    description: SITE_DESCRIPTION,
  },
};

export default async function Home() {
  const sponsors = await getSponsors();

  return (
   <main id="main">
      <div className="flex min-h-svh flex-col bg-blue-600">
        <HeroSection />
      </div>
      <AboutSection />
      <YearbookSection />
      <EventShowcaseSection />
      <CareerSpotlightSection />
      <MascaCareSection />
      <SponsorsSection sponsors={sponsors} />
      <MascaVoiceSection />
      <FollowUsSection />
      <PostOnOurPageSection />
    </main>
  );
}
