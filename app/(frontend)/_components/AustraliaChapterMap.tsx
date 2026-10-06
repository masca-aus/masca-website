"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Camera, Globe, Pause, Play } from "lucide-react";
import { STATES } from "@/utils/states";
import styles from "./AustraliaChapterMap.module.css";

// Coordinates are in the source map's 460 × 420 viewBox. Markers indicate
// each listed capital. CSS anchors the dot (not the label) at this point.
const chapterMarkers = [
  { code: "WA", x: 33, y: 256 },
  { code: "SA", x: 286, y: 296 },
  { code: "TAS", x: 380, y: 405 },
  { code: "VIC", x: 350, y: 338 },
  { code: "ACT", x: 399, y: 301 },
  { code: "NSW", x: 423, y: 281 },
  { code: "QLD", x: 443, y: 198 },
] as const;

// Chapter accounts supplied by MASCA or checked against chapter sources.
const chapterInstagram: Record<string, string> = {
  NSW: "masca_nsw",
  VIC: "masca_victoria",
  QLD: "masca_qld",
  WA: "masca_westernaustralia",
  SA: "aumsa_adelaide",
  ACT: "mso_anu",
  TAS: "mss.tasmania",
};

// Single-MSO states link directly to their student organisation.
const localOrganisations: Record<string, string> = {
  SA: "AUMSA",
  ACT: "MSO ACT",
  TAS: "MSST",
};

export default function AustraliaChapterMap() {
  const [selectedCode, setSelectedCode] = useState<string>("NSW");
  const [isRotating, setIsRotating] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const respectMotionPreference = () => {
      if (preference.matches) setIsRotating(false);
    };
    const updateVisibility = () => setIsPageVisible(!document.hidden);
    respectMotionPreference();
    updateVisibility();
    preference.addEventListener("change", respectMotionPreference);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      preference.removeEventListener("change", respectMotionPreference);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!isRotating || isHovered || hasFocus || !isPageVisible) return;
    const timer = window.setTimeout(() => {
      const currentIndex = chapterMarkers.findIndex(({ code }) => code === selectedCode);
      setSelectedCode(chapterMarkers[(currentIndex + 1) % chapterMarkers.length].code);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [selectedCode, isRotating, isHovered, hasFocus, isPageVisible]);

  const selectState = (code: string) => {
    setIsRotating(false);
    setSelectedCode(code);
  };
  const activeMarker = chapterMarkers.find(({ code }) => code === selectedCode) ?? chapterMarkers[0];
  const selected = STATES.find((state) => state.code === selectedCode) ?? STATES[0];
  const instagramHandle = chapterInstagram[selected.code];
  const organisation = localOrganisations[selected.code] ?? `MASCA ${selected.name}`;

  return (
    <div
      className={styles.module}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setIsHovered(true);
      }}
      onPointerLeave={() => setIsHovered(false)}
      onFocusCapture={(event) => setHasFocus(!event.target.hasAttribute("data-tour-toggle"))}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
    >
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
          <span
            className={styles.activeMarker}
            style={{ left: `${(activeMarker.x / 460) * 100}%`, top: `${(activeMarker.y / 420) * 100}%` }}
            aria-hidden="true"
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
                aria-label={`Show ${chapter.name}, ${chapter.capital}`}
                aria-pressed={selectedCode === code}
                title={`${chapter.name} · ${chapter.capital}`}
                onClick={() => selectState(code)}
              >
                <span className={styles.pinDot} />
                <span className={styles.pinLabel}>{code}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.selectedCard} aria-live={isRotating ? "off" : "polite"}>
        <div key={selected.code} className={styles.selectedDetails}>
          <strong>{selected.name}</strong>
          <small>{localOrganisations[selected.code] ? `${organisation} · ` : ""}{selected.capital}</small>
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
              aria-label={`Open ${organisation} on Instagram, @${instagramHandle}`}
            >
              <Camera size={17} aria-hidden="true" />
              <span>Instagram</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          ) : <span className={styles.pendingLink}>Instagram link pending</span>}
        </div>
      </div>
      <button
        type="button"
        className={styles.rotationToggle}
        data-tour-toggle
        aria-label={isRotating ? "Pause automatic state rotation" : "Resume automatic state rotation"}
        onClick={() => setIsRotating((rotating) => !rotating)}
      >
        {isRotating ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
        <span>{isRotating ? "Pause tour" : "Resume tour"}</span>
      </button>
      <div className={styles.chapterList} aria-label="Choose a state or territory">
        {STATES.map((state) => <button key={state.code} type="button" onClick={() => selectState(state.code)} aria-pressed={selectedCode === state.code}>{state.code}</button>)}
      </div>
    </div>
  );
}
