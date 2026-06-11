import type { Metadata } from "next";

import { SITE_NAME, SITE_DESCRIPTION } from "@/utils/seo";
import HeroSection from "./sections/hero";
import UpcomingEvent from "./sections/upcomingEvent";
import StatesSection from "./sections/states";
import EventShowcaseSection from "./sections/eventShowcase";
import MascaCareSection from "./sections/mascaCare";
import MascaVoiceSection from "./sections/mascaVoice";
import YearbookSection from "./sections/yearbook";
import AboutSection from "./sections/about";
import SponsorsSection from "./sections/sponsors";
import JoinUsSection from "./sections/joinUs";
import { getSponsors } from "@/utils/sponsors";

export const metadata: Metadata = {
  // Homepage uses an absolute, keyword-rich title instead of "Home | MASCA".
  title: { absolute: SITE_NAME },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default async function Home() {
  const sponsors = await getSponsors();

  return (
   <main>
      <HeroSection upcomingEvent={<UpcomingEvent />} />
      <AboutSection />
      <YearbookSection />
      <StatesSection />
      <EventShowcaseSection />
      <MascaVoiceSection />
      <MascaCareSection />
      <SponsorsSection sponsors={sponsors} />
      <JoinUsSection />
    </main>
  );
}