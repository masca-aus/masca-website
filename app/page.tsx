import type { Metadata } from "next";

import HeroSection from "./sections/hero";
import UpcomingEvent from "./sections/upcomingEvent";
import StatesSection from "./sections/states";
import EventShowcaseSection from "./sections/eventShowcase";
import MascaCareSection from "./sections/mascaCare";
import BukuLatihanSection from "./sections/bukuLatihan";
import JoinUsSection from "./sections/joinUs";
import { getSponsorLogos } from "@/utils/sponsors";

export const metadata: Metadata = {
  title: "Home | MASCA",
  description: "The Malaysian Students' Council of Australia (MASCA) is the official, peak student representative body for Malaysian students in Australia. Established in April 2001, it operates as a non-profit organization across six states and one territory to advocate for students' welfare, promote academic excellence, and celebrate Malaysian culture.",
};

export default function Home() {
  const sponsors = getSponsorLogos();

  return (
   <main>
      <HeroSection upcomingEvent={<UpcomingEvent />} />
      <StatesSection />
      <EventShowcaseSection />
      <MascaCareSection />
      <BukuLatihanSection sponsors={sponsors} />
      <JoinUsSection />
    </main>
  );
}