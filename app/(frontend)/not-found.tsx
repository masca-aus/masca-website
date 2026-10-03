import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";

import Button from "@/components/Button";
import TravelPostcardArt from "@/components/TravelPostcardArt";
import styles from "./not-found.module.css";

const postcards = [
  {
    subject: "food" as const,
    label: "Malaysia · First, we makan",
    title: "Nasi lemak",
    description: "Coconut rice, sambal, anchovies, peanuts, cucumber and egg. A breakfast worth finding your way to.",
    aside: "Yes, we can talk about food all day.",
  },
  {
    subject: "towers" as const,
    label: "Malaysia · Look up, lah",
    title: "Petronas Twin Towers",
    description: "Kuala Lumpur’s iconic pair reaches 452 metres into the sky. One tower would have been a little shy.",
    aside: "Twice the towers. Twice the neck craning.",
  },
  {
    subject: "opera" as const,
    label: "Australia · Harbour a look",
    title: "Sydney Opera House",
    description: "Those famous sails belong to a performing arts landmark on Sydney Harbour. Quite the spot for a little drama.",
    aside: "Even the roof knows how to make an entrance.",
  },
  {
    subject: "reef" as const,
    label: "Australia · Take the scenic route",
    title: "Great Barrier Reef",
    description: "Off Queensland’s coast, coral gardens are home to colourful fish and sea turtles. There’s a whole world beneath the surface.",
    aside: "The locals here are excellent swimmers.",
  },
];

export default function NotFound() {
  return (
    <main id="main" className={styles.page}>
      <section className={`container ${styles.hero}`} aria-labelledby="missing-title">
        <div className={styles.errorNumber} aria-hidden="true">404</div>

        <div className={styles.heroCopy}>
          <h1 id="missing-title">Alamak, page not found.</h1>
          <p className={styles.intro}>This page has gone jalan-jalan. Let’s get you somewhere good.</p>
          <div className={styles.actions}>
            <Button href="/" variant="primary">Back home</Button>
            <a href="#little-detour" className={styles.detourLink}>Explore below <ArrowDown size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section id="little-detour" className={styles.discover} aria-labelledby="discover-title">
        <div className="container">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Malaysia × Australia</p>
              <h2 id="discover-title">One wrong turn. <span>Two places to explore.</span></h2>
            </div>
            <p>A taste of Malaysia. A little Down Under.<br />Consider this your complimentary mini tour.</p>
          </div>

          <div className={styles.postcards}>
            {postcards.map((card, index) => (
              <article key={card.subject} className={styles.postcard}>
                <div className={styles.illustration} data-subject={card.subject}>
                  <span className={styles.cardNumber}>0{index + 1}</span>
                  <TravelPostcardArt subject={card.subject} />
                </div>
                <div className={styles.cardCopy}>
                  <p className={styles.cardLabel}>{card.label}</p>
                  <h3>{card.title}</h3>
                  <p className={styles.description}>{card.description}</p>
                  <p className={styles.aside}>{card.aside}</p>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.tourismLinks} aria-label="Official tourism websites">
            <a href="https://www.malaysia.travel/" className={styles.tourismLink}>
              <span><span className={styles.tourismEyebrow}>Keep the jalan-jalan going</span><strong>Explore with Tourism Malaysia</strong><span className={styles.tourismDomain}>Official visitor guide · malaysia.travel</span></span>
              <ArrowUpRight size={22} aria-hidden="true" />
            </a>
            <a href="https://www.australia.com/en" className={styles.tourismLink}>
              <span><span className={styles.tourismEyebrow}>A little more Down Under</span><strong>Explore with Tourism Australia</strong><span className={styles.tourismDomain}>Official visitor guide · australia.com</span></span>
              <ArrowUpRight size={22} aria-hidden="true" />
            </a>
          </div>

          <div className={styles.onward}>
            <p>A little lost. A little closer to both worlds.</p>
            <Link href="/events">Find your people at our events <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <p className={styles.brokenLink}>Followed a link that should work? <Link href="/contact">Give us a heads-up <ArrowUpRight size={14} aria-hidden="true" /></Link></p>
        </div>
      </section>
    </main>
  );
}
