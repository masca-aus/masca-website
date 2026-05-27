import HeroSection from "./sections/hero";
import StatesSection from "./sections/states";
import EventShowcaseSection from "./sections/eventShowcase";
import MascaCareSection from "./sections/mascaCare";
import BukuLatihanSection from "./sections/bukuLatihan";
import JoinUsSection from "./sections/joinUs";
import { getSponsorLogos } from "@/utils/sponsors";

export default function Home() {
  const sponsors = getSponsorLogos();

  return (
   <main>
      <HeroSection />
      <StatesSection />
      <EventShowcaseSection />
      <MascaCareSection />
      <BukuLatihanSection sponsors={sponsors} />
      <JoinUsSection />
    </main>
  );
}