'use client'

import Image from "next/image";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import Button from "@/components/Button";

const flagshipEvents = [
  { id: 1, name: "Malaysia Night 2026", location: "KLCC", time: "6-11pm", date: "12 Mar", state: "VIC", price: "$35", registerOpen: true }, 
  { id: 2, name: "Malaysia Night 2026", location: "RMIT Bundoora Campus", time: "6-11pm", date: "12 Mar", state: "VIC", price: "$35", registerOpen: true }, 
  { id: 3, name: "Malaysia Night 2026", location: "KLCC", time: "6-11pm", date: "12 Mar", state: "VIC", price: "$35", registerOpen: true }, 
]

export default function EventShowcaseSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from(".event-card", {
      opacity: 0,
      y: 24,
      duration: 0.5,
      stagger: 0.08,
      ease: "entranceEase",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
      },
    })
  }, { scope: containerRef })

  return (
    <section>

      <div className="flex flex-col gap-8 container py-16">
        <header className="flex flex-col gap-4">
          <span className="eyebrow text-red-600">What&apos;s on this month</span>
          <span className="title text-blue-600">Our flagship event</span>
        </header>

        <p className="text-gray-700">From Malaysia Night galas to study sessions and durian-tasting socials. <br/> Pick something, bring a friend, jom!</p>

        <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {flagshipEvents.map((event) => (
              <EventCard key={ event.id } event={ event } />
          ))}
        </div>
      </div>

    </section>
  )
}

interface EventData {
  id: number;
  name: string;
  location: string;
  time: string;
  date: string;
  state: string;
  price: string;
  registerOpen: boolean;
  img?: string;
}

function EventCard({ event }: { event: EventData }) {
  const cardRef = useRef<HTMLElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useGSAP(() => {
    tweenRef.current = gsap.to(cardRef.current, {
      y: -8,
      ease: "entranceEase",
      boxShadow: "var(--shadow-lg)",
      paused: true,
    })
  }, { scope: cardRef })

  return (
    <article 
      ref={cardRef} 
      className="event-card flex flex-col w-full max-w-md rounded-2xl shadow-md overflow-hidden bg-white"
      onMouseEnter={() => tweenRef.current?.play()}
      onMouseLeave={() => tweenRef.current?.reverse()}
    >
      {/* Top banner — image if present, else blue gradient */}
      <div className="relative min-h-44 bg-linear-to-br from-blue-900 to-blue-950">
        {event.img && (
          <Image
            src={event.img}
            alt={event.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <span className="absolute top-6 left-6 text-sm font-bold tracking-[0.2em] text-yellow-400">
          {event.state} CHAPTER
        </span>
        <span className="absolute top-5 right-6 rounded-full bg-yellow-400 px-4 py-2 text-sm font-bold text-blue-950">
          {event.date}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-h4 font-bold text-blue-600">{event.name}</h3>
          <span className="text-sm text-gray-500">
            {event.location} · {event.time}
          </span>
        </div>

        <div className="border-b border-gray-200" />

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-red-700">{event.price}</span>
          <Button variant="ghost">
            Register <span aria-hidden>&rarr;</span>
          </Button>
        </div>
      </div>
    </article>
  );
}


