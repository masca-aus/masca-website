"use client";

import Image from "next/image";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { ANNIVERSARY_PHOTOS, type AnniversaryPhoto } from "@/utils/anniversaryPhotos";
import { subscribeAnniversaryReplay } from "@/utils/anniversaryReplay";
import styles from "./AnniversaryIntro.module.css";

const DURATION_MS = 2400;
const COLLAGE_SIZE = 6;
const SLIDE_AT_MS = 850;
const SLIDE_DEADLINE_MS = 1200;
const PHOTO_HEIGHT = 330;

export default function AnniversaryIntro() {
  const [replayCount, setReplayCount] = useState(0);

  useEffect(() => subscribeAnniversaryReplay(() => setReplayCount((count) => count + 1)), []);

  return replayCount > 0 ? <IntroAnimation key={replayCount} /> : null;
}

function IntroAnimation() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const photoClipId = useId();
  const numberId = `${photoClipId}-number`;
  const orbitId = `${photoClipId}-orbit`;
  const sheenId = `${photoClipId}-sheen`;
  const [photos, setPhotos] = useState<(AnniversaryPhoto | null)[]>(() => Array(COLLAGE_SIZE).fill(null));
  const [nextPair, setNextPair] = useState(false);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!dialog?.showModal) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const requests: HTMLImageElement[] = [];
    const decodedSlots = new Set<number>();
    let acceptPhotos = true;
    let slideWindowOpen = false;
    const slideIfReady = () => {
      if (acceptPhotos && dialog.open && slideWindowOpen && [0, 1, 2, 3].every((slot) => decodedSlots.has(slot))) {
        setNextPair(true);
      }
    };
    const releasePhotos = () => {
      acceptPhotos = false;
      for (const request of requests) {
        request.onload = null;
        request.onerror = null;
        request.removeAttribute("src");
      }
    };
    const dismiss = () => dialog.close();
    const finish = () => {
      // Ignore a close event queued before Strict Mode reopened the dialog.
      if (dialog.open) return;
      window.clearTimeout(timer);
      window.clearTimeout(slideTimer);
      window.clearTimeout(slideDeadline);
      releasePhotos();
      root.style.overflow = previousOverflow;
    };

    // This artwork mounts only after an anniversary badge request.
    // Homepage visits never open a dialog or request its photos.
    dialog.showModal();
    root.style.overflow = "hidden";
    const timer = window.setTimeout(dismiss, DURATION_MS);
    const slideTimer = window.setTimeout(() => {
      slideWindowOpen = true;
      slideIfReady();
    }, SLIDE_AT_MS);
    const slideDeadline = window.setTimeout(() => { slideWindowOpen = false; }, SLIDE_DEADLINE_MS);
    dialog.addEventListener("close", finish);
    motion.addEventListener("change", dismiss);

    const selection = motion.matches ? [] : [...ANNIVERSARY_PHOTOS];
    for (let index = selection.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [selection[index], selection[other]] = [selection[other], selection[index]];
    }
    selection.slice(0, COLLAGE_SIZE).forEach((photo, slot) => {
      const request = new window.Image();
      requests.push(request);
      request.decoding = "async";
      request.onload = () => {
        const decoded = typeof request.decode === "function" ? request.decode() : Promise.resolve();
        void decoded.then(() => {
          if (!acceptPhotos || !dialog.open) return;
          decodedSlots.add(slot);
          setPhotos((current) => current.map((item, index) => index === slot ? photo : item));
          slideIfReady();
        }, () => { /* An unavailable photo leaves the navy background intact. */ });
      };
      request.src = photo.src;
    });

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(slideTimer);
      window.clearTimeout(slideDeadline);
      releasePhotos();
      dialog.removeEventListener("close", finish);
      motion.removeEventListener("change", dismiss);
      if (dialog.open) dialog.close();
      root.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.intro}
      aria-label="Celebrating MASCA’s 25th anniversary"
      style={{ "--anniversary-duration": `${DURATION_MS}ms` } as CSSProperties}
    >
      <div className={styles.collage} aria-hidden="true">
        {photos.map((photo, index) => (
          <div key={index} className={styles.photoSlot} style={{ "--slot": index, "--entry-x": index % 2 ? "28px" : "-28px", "--entry-y": index < 3 ? "-20px" : "20px" } as CSSProperties}>
            {photo && <Image src={photo.src} alt="" fill unoptimized loading="eager" sizes="(max-width: 640px) 50vw, 34vw" className={styles.photo} />}
          </div>
        ))}
      </div>
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.brand} aria-hidden="true">
          <span className={styles.brandMark}>
            <Image src="/logo/logo.webp" alt="" width={30} height={33} priority />
          </span>
          <span>MASCA</span>
        </div>
        <h2 className={styles.anniversary} aria-label="25 years">
          <span className={styles.number} aria-hidden="true">
            <svg viewBox="0 0 560 360">
              <defs>
                <ellipse id={orbitId} cx="280" cy="185" rx="258" ry="146" transform="rotate(-19 280 185)" pathLength="1" />
                <linearGradient id={sheenId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fff8d6" stopOpacity="0" />
                  <stop offset="50%" stopColor="#fff8d6" stopOpacity=".8" />
                  <stop offset="100%" stopColor="#fff8d6" stopOpacity="0" />
                </linearGradient>
                <g id={numberId}>
                  <text id={`${numberId}-2`} className={styles.glyph} x="280" y="303" textAnchor="end">2</text>
                  <text id={`${numberId}-5`} className={styles.glyph} x="248" y="303">5</text>
                </g>
                <clipPath id={photoClipId} clipPathUnits="userSpaceOnUse">
                  <use href={`#${numberId}-2`} />
                  <use href={`#${numberId}-5`} />
                </clipPath>
                {[2, 5].map((digit) => (
                  <clipPath key={digit} id={`${numberId}-${digit}-clip`} clipPathUnits="userSpaceOnUse">
                    <use href={`#${numberId}-${digit}`} />
                  </clipPath>
                ))}
              </defs>
              <use href={`#${orbitId}`} className={styles.orbit} />
              <use href={`#${orbitId}`} className={styles.orbitLight} />
              <use href={`#${numberId}`} className={styles.numberBase} />
              {[2, 5].map((digit, index) => (
                <g key={digit} clipPath={`url(#${numberId}-${digit}-clip)`}>
                  <g className={styles.photoNumber}>
                    <svg x={index === 0 ? 28 : 228} y="0" width="260" height={PHOTO_HEIGHT} viewBox={`0 0 260 ${PHOTO_HEIGHT}`} overflow="hidden">
                      <g className={styles.photoStrip} style={{ transform: nextPair ? `translateY(-${PHOTO_HEIGHT}px)` : "translateY(0)" }}>
                        {[index, index + 2].map((slot, frame) => photos[slot] && (
                          <image key={photos[slot].src} href={photos[slot].src} x="0" y={frame * PHOTO_HEIGHT} width="260" height={PHOTO_HEIGHT} preserveAspectRatio="xMidYMid slice" />
                        ))}
                      </g>
                    </svg>
                  </g>
                </g>
              ))}
              <use href={`#${numberId}`} className={styles.outline} />
              <use href={`#${numberId}`} className={styles.gold} />
              <g clipPath={`url(#${photoClipId})`}>
                <rect className={styles.sheen} x="-180" y="0" width="150" height="360" fill={`url(#${sheenId})`} />
              </g>
            </svg>
            <span className={styles.ordinal}>th</span>
          </span>
          <span className={styles.anniversaryLabel} aria-hidden="true">Anniversary</span>
        </h2>
        <p className={styles.dates}>2001 — 2026</p>
      </div>
    </dialog>
  );
}
