import HeroSection from "./sections/hero";
import StatesSection from "./sections/states";
import EventShowcaseSection from "./sections/eventShowcase";
import MascaCareSection from "./sections/mascaCare";
import BukuLatihanSection from "./sections/bukuLatihan";
import JoinUsSection from "./sections/joinUs";

export default function Home() {
  return (
   <main>
      <HeroSection />
      <StatesSection />
      <EventShowcaseSection />
      <MascaCareSection />
      <BukuLatihanSection />
      <JoinUsSection />
    </main>
  );
}