import BukuLatihanSection from "./sections/bukuLatihan";
import HeroSection from "./sections/hero";
import JoinUsSection from "./sections/joinUs";
import MascaCareSection from "./sections/mascaCare";
import StatesSection from "./sections/states";

export default function Home() {
  return (
   <main>
      <HeroSection />
      <StatesSection />
      <MascaCareSection />
      <BukuLatihanSection />
      <JoinUsSection />
    </main>
  );
}