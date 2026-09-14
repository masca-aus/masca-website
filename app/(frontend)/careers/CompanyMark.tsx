'use client'

import { useState } from "react"

// Company logo with a monogram fallback. The monogram is always painted
// underneath and the image (alt="") sits on top, so a logo that fails to load
// before hydration still shows initials — no dependence on onError timing.
// Only committee-supplied https URLs reach here; no third-party logo lookups.

/** "Nasi Lemak Bank" → "NL"; "Atlassian" → "A". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word))
    .slice(0, 2)
    .map((word) => word.replace(/[^a-z0-9]/gi, "")[0]?.toUpperCase() ?? "")
    .join("")
}

export default function CompanyMark({
  name,
  logoUrl,
  size = "sm",
}: {
  name: string
  logoUrl?: string
  size?: "sm" | "lg"
}) {
  const [failed, setFailed] = useState(false)
  const box = size === "lg" ? "size-16 rounded-xl text-xl" : "size-10 rounded-lg text-sm"

  return (
    <span
      className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-blue-600 font-bold text-yellow-500 ${box}`}
      aria-hidden="true"
    >
      {initials(name)}
      {logoUrl && !failed && (
        // Plain <img>: the host is whatever the committee pasted, so
        // next/image's remotePatterns would need updating per employer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full bg-white object-contain p-1"
        />
      )}
    </span>
  )
}
