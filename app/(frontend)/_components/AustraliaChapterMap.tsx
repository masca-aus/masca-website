"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Camera, Globe } from "lucide-react";
import { STATES } from "@/utils/states";
import styles from "./AustraliaChapterMap.module.css";

// Coordinates are in the source map's 460 × 420 viewBox. Markers indicate
// the chapter's listed capital, rather than the geographical centre of a state.
const chapterMarkers = [
  { code: "WA", x: 74, y: 272 },
  { code: "SA", x: 299, y: 312 },
  { code: "VIC", x: 346, y: 345 },
  { code: "ACT", x: 390, y: 318 },
  { code: "NSW", x: 420, y: 295 },
  { code: "QLD", x: 411, y: 219 },
  { code: "TAS", x: 370, y: 390 },
] as const;

// Chapter accounts supplied by MASCA or checked against chapter sources.
const chapterInstagram: Record<string, string> = {
  NSW: "masca_nsw",
  VIC: "masca_victoria",
  QLD: "masca_qld",
  WA: "masca_westernaustralia",
  SA: "masca_sa",
  ACT: "masca_act",
  TAS: "masca.tasmania",
};

export default function AustraliaChapterMap() {
  const [selectedCode, setSelectedCode] = useState<string>("NSW");
  const selected = STATES.find((state) => state.code === selectedCode) ?? STATES[0];
  const instagramHandle = chapterInstagram[selected.code];

  return (
    <div className={styles.module}>
      <div className={styles.mapFrame}>
        <div className={styles.mapCanvas}>
          <Image
            src="/australia-states.svg"
            alt=""
            aria-hidden="true"
            width={460}
            height={420}
            className={styles.mapImage}
          />
          {chapterMarkers.map(({ code, x, y }) => {
            const chapter = STATES.find((state) => state.code === code);
            if (!chapter) return null;
            return (
              <button
                key={code}
                type="button"
                className={`${styles.pin} ${selectedCode === code ? styles.pinSelected : ""}`}
                style={{ left: `${(x / 460) * 100}%`, top: `${(y / 420) * 100}%` }}
                aria-label={`Show ${chapter.name} chapter, ${chapter.capital}`}
                aria-pressed={selectedCode === code}
                title={`${chapter.name} · ${chapter.capital}`}
                onClick={() => setSelectedCode(code)}
              >
                <span className={styles.pinDot} />
                <span className={styles.pinLabel}>{code}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.selectedCard} aria-live="polite">
        <div className={styles.selectedDetails}>
          <strong>{selected.name}</strong>
          <small>{selected.capital}</small>
        </div>
        <div className={styles.actions}>
          {selected.code === "NSW" && (
            <a
              className={styles.websiteLink}
              href="https://www.mascansw.com.au/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open MASCA New South Wales website"
            >
              <Globe size={17} aria-hidden="true" />
              <span>Website</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          )}
          {instagramHandle ? (
            <a
              href={`https://www.instagram.com/${instagramHandle}/`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open MASCA ${selected.name} on Instagram, @${instagramHandle}`}
            >
              <Camera size={17} aria-hidden="true" />
              <span>Instagram</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          ) : <span className={styles.pendingLink}>Instagram link pending</span>}
        </div>
      </div>
      <div className={styles.chapterList} aria-label="Choose a chapter">
        {STATES.map((state) => <button key={state.code} type="button" onClick={() => setSelectedCode(state.code)} aria-pressed={selectedCode === state.code}>{state.code}</button>)}
      </div>
    </div>
  );
}
