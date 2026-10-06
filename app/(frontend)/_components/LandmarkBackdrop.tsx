"use client";

import { useState } from "react";
import Image from "next/image";
import { stateLandmarks } from "./stateLandmarks";
import styles from "./LandmarkBackdrop.module.css";

export default function LandmarkBackdrop({ selectedCode }: { selectedCode: string }) {
  const [loadedPhotos, setLoadedPhotos] = useState<string[]>([]);
  const [backdropCode, setBackdropCode] = useState<string | null>(null);

  // Retain the previous scene while a newly selected photograph loads.
  if (backdropCode !== selectedCode && loadedPhotos.includes(selectedCode)) {
    setBackdropCode(selectedCode);
  }

  return (
    <div className={styles.backdrop} aria-hidden="true">
      {stateLandmarks.map((photo) => (
        <Image
          key={photo.code}
          src={photo.src}
          alt=""
          width={1920}
          height={1080}
          unoptimized
          loading="eager"
          className={`${styles.photo} ${backdropCode === photo.code ? styles.visible : ""}`}
          style={{ objectPosition: photo.position }}
          data-landmark={photo.code}
          data-visible={backdropCode === photo.code}
          onLoad={() => setLoadedPhotos((loaded) => loaded.includes(photo.code) ? loaded : [...loaded, photo.code])}
        />
      ))}
      <div className={styles.shade} />
    </div>
  );
}
