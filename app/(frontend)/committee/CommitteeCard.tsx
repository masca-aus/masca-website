'use client'

import { useRef } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"

import type { CommitteeMember } from "@/utils/committee"

/**
 * A single committee member tile: portrait on top, with the name pinned
 * bottom-left and the role bottom-right directly beneath the image.
 * Clicking anywhere on the tile opens the expanded modal.
 */
export default function CommitteeCard({
  member,
  onOpen,
}: {
  member: CommitteeMember
  onOpen: (member: CommitteeMember) => void
}) {
  const cardRef = useRef<HTMLButtonElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  useGSAP(() => {
    // Paused hover timeline — lift the tile and ease the portrait into a
    // subtle zoom; reverse() on leave restores both automatically.
    tl.current = gsap.timeline({ paused: true })
      .to(cardRef.current, {
        y: -8,
        boxShadow: "var(--shadow-brand)",
        duration: 0.3,
        ease: "none",
      })
      .to(cardRef.current!.querySelector(".member-img"), {
        scale: 1.05,
        duration: 0.4,
        ease: "entranceEase",
      }, 0)
  }, { scope: cardRef })

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onOpen(member)}
      onMouseEnter={() => tl.current?.play()}
      onMouseLeave={() => tl.current?.reverse()}
      aria-label={`View ${member.name}, ${member.role}`}
      className="member-card group flex flex-col text-left bg-white rounded-lg overflow-hidden shadow-xl cursor-pointer"
    >
      {/* Portrait — fixed portrait frame keeps the grid tidy while the image
          scales to fill it. */}
      <div className="relative aspect-3/4 overflow-hidden bg-blue-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={member.img}
          alt={member.name}
          loading="lazy"
          className="member-img absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Name (bottom-left) + role (bottom-right), directly below the image */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-0 md:gap-3 px-3 py-3 md:px-4">
        <span className="text-sm md:text-body font-semibold text-blue-600 leading-tight">
          {member.name}
        </span>
        <span className="text-caption md:text-body-sm font-medium text-gray-700 text-right leading-tight">
          {member.role}
        </span>
      </div>
    </button>
  )
}
