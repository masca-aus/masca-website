"use client";

import { useState } from "react";
import Image from "next/image";
import { stateLandmarks } from "./stateLandmarks";
import styles from "./LandmarkBackdrop.module.css";

export default function LandmarkBackdrop({ selectedCode, variant }: { selectedCode: string; variant: "landmark" | "university" }) {
  const [loadedPhotos, setLoadedPhotos] = useState<string[]>([]);
  const [backdropId, setBackdropId] = useState<string | null>(null);
  const selectedId = `${selectedCode}-${variant}`;

  // Retain the previous scene while a newly selected photograph loads.
  if (backdropId !== selectedId && loadedPhotos.includes(selectedId)) {
    setBackdropId(selectedId);
  }

  return (
    <div className={styles.backdrop} aria-hidden="true">
      {stateLandmarks.map((photo) => {
        const id = `${photo.code}-${photo.variant}`;
        // Defer university downloads until their first lap; retain loaded scenes for crossfades.
        if (photo.variant !== variant && !loadedPhotos.includes(id)) return null;
        return (
          <picture key={id}>
            {/* A local blank source prevents hidden photos downloading on mobile. */}
            <source media="(max-width: 1023px)" srcSet="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
            <Image
              src={photo.src}
              alt=""
              width={1920}
              height={1080}
              unoptimized
              loading="eager"
              className={`${styles.photo} ${backdropId === id ? styles.visible : ""}`}
              style={{ objectPosition: photo.position }}
              data-landmark={photo.code}
              data-photo={id}
              data-visible={backdropId === id}
              onLoad={() => setLoadedPhotos((loaded) => loaded.includes(id) ? loaded : [...loaded, id])}
            />
          </picture>
        );
      })}
      <div className={styles.shade} />
    </div>
  );
}
