"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "./CommunityPhotoCarousel.module.css";

export type CarouselPhoto = {
  src: string;
  alt: string;
  caption?: string;
  position?: string;
};

type Props = {
  label: string;
  photos: readonly CarouselPhoto[];
  sizes: string;
  autoPlay?: boolean;
  priority?: boolean;
};

export default function CommunityPhotoCarousel({ label, photos, sizes, autoPlay = false, priority = false }: Props) {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stoppedByUser, setStoppedByUser] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!autoPlay || photos.length < 2 || hovered || focused || stoppedByUser) return;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) return;

    const timer = window.setInterval(() => {
      const bounds = rootRef.current?.getBoundingClientRect();
      if (document.visibilityState === "visible" && bounds && bounds.bottom > 0 && bounds.top < window.innerHeight) {
        setActive((current) => (current + 1) % photos.length);
      }
    }, 6500);

    return () => window.clearInterval(timer);
  }, [autoPlay, focused, hovered, photos.length, stoppedByUser]);

  const showPhoto = (index: number) => {
    setStoppedByUser(true);
    setActive((index + photos.length) % photos.length);
  };

  if (photos.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className={styles.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node)) setFocused(false);
      }}
      onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const distance = event.changedTouches[0]?.clientX - touchStartX.current;
        touchStartX.current = null;
        if (distance !== undefined && Math.abs(distance) > 45) showPhoto(active + (distance < 0 ? 1 : -1));
      }}
    >
      {photos.map((photo, index) => (
        <div key={photo.src} className={`${styles.slide} ${index === active ? styles.slideActive : ""}`} aria-hidden={index !== active}>
          <Image
            src={photo.src}
            alt={index === active ? photo.alt : ""}
            fill
            sizes={sizes}
            priority={priority && index === 0}
            className={styles.image}
            style={{ objectPosition: photo.position ?? "center" }}
          />
        </div>
      ))}
      {photos[active].caption && <span className={styles.caption}>{photos[active].caption}</span>}
      {photos.length > 1 && (
        <div className={styles.controls} aria-label={`${label} controls`}>
          <button type="button" className={styles.controlButton} onClick={() => showPhoto(active - 1)} aria-label="Previous photo"><ChevronLeft size={20} aria-hidden="true" /></button>
          <span className={styles.counter} aria-live="off">{String(active + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
          <button type="button" className={styles.controlButton} onClick={() => showPhoto(active + 1)} aria-label="Next photo"><ChevronRight size={20} aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}
