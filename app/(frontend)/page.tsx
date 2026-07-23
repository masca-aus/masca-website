import type { Metadata } from "next";

import { SITE_NAME_FULL, SITE_DESCRIPTION } from "@/utils/seo";
import HeroSection from "./sections/hero";
import UpcomingEvent from "./sections/upcomingEvent";
import StatesSection from "./sections/states";
import EventShowcaseSection from "./sections/eventShowcase";
import MascaCareSection from "./sections/mascaCare";
import MascaVoiceSection from "./sections/mascaVoice";
import YearbookSection from "./sections/yearbook";
import AboutSection from "./sections/about";
import SponsorsSection from "./sections/sponsors";
import FollowUsSection from "./sections/followUs";
import JoinUsSection from "./sections/joinUs";
import { getSponsors } from "@/utils/sponsors";

export const metadata: Metadata = {
  // Homepage uses an absolute, keyword-rich title that matches the WebSite
  // schema's `name` and og:site_name exactly, so every site-name signal Google
  // reads says the full form with the acronym.
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
      <HeroSection upcomingEvent={<UpcomingEvent />} />
      <AboutSection />
      <YearbookSection />
      <StatesSection />
      <EventShowcaseSection />
      <MascaVoiceSection />
      <MascaCareSection />
      <SponsorsSection sponsors={sponsors} />
      <FollowUsSection />
      <JoinUsSection />
    </main>
  );
}