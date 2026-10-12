"use client";

import { useRef, useState } from "react";
import {
  ArrowRight, HeartHandshake, MessageCircle, Phone, type LucideIcon,
} from "lucide-react";
import type { PublicCarePathway } from "@/features/care/publicCarePathways";

type PathwayStyle = { eyebrow: string; icon: LucideIcon; accent: string; soft: string; text: string; activeCard: string; activeIcon: string; activeEyebrow: string; activeDescription: string };

const pathwayStyles: PathwayStyle[] = [
  { eyebrow: "Start here", icon: HeartHandshake, accent: "bg-blue-600", soft: "bg-blue-50", text: "text-blue-600", activeCard: "border-blue-600 bg-blue-600 text-white shadow-brand lg:-translate-y-2", activeIcon: "bg-yellow-500 text-blue-900", activeEyebrow: "text-yellow-500", activeDescription: "text-blue-100" },
  { eyebrow: "Plan ahead", icon: HeartHandshake, accent: "bg-yellow-500", soft: "bg-yellow-50", text: "text-yellow-800", activeCard: "border-yellow-500 bg-yellow-500 text-blue-900 shadow-brand lg:-translate-y-2", activeIcon: "bg-blue-600 text-white", activeEyebrow: "text-blue-800", activeDescription: "text-blue-900" },
  { eyebrow: "Find your footing", icon: HeartHandshake, accent: "bg-yellow-500", soft: "bg-yellow-50", text: "text-yellow-800", activeCard: "border-yellow-500 bg-yellow-500 text-blue-900 shadow-brand lg:-translate-y-2", activeIcon: "bg-blue-600 text-white", activeEyebrow: "text-blue-800", activeDescription: "text-blue-900" },
  { eyebrow: "Keep moving", icon: HeartHandshake, accent: "bg-blue-600", soft: "bg-blue-50", text: "text-blue-600", activeCard: "border-blue-600 bg-blue-600 text-white shadow-brand lg:-translate-y-2", activeIcon: "bg-yellow-500 text-blue-900", activeEyebrow: "text-yellow-500", activeDescription: "text-blue-100" },
];

const states: { code: string; instagram?: string }[] = [
  { code: "VIC", instagram: "https://www.instagram.com/mascavic/" },
  { code: "NSW", instagram: "https://www.instagram.com/masca_nsw/" },
  { code: "QLD" },
  { code: "WA" },
  { code: "SA" },
  { code: "ACT" },
  { code: "TAS" },
];

const communityLinks = [
  {
    key: "instagram",
    label: "Instagram",
    description: "Stay in the loop! Get latest updates on events, gatherings, and everything happening in our community.",
    logoStyle: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white shadow-lg shadow-pink-200",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    description: "Meet, connect & support! Join the group to make new friends, ask questions, share tips, and find your people in the community.",
    logoStyle: "bg-green-600 text-white shadow-lg shadow-green-200",
  },
] as const;

const stateBubblePositions = [
  "left-0 top-0 lg:left-[5%] lg:top-[4%]",
  "left-1/2 top-0 -translate-x-1/2",
  "right-0 top-0 lg:right-[5%]",
  "left-0 top-1/2 -translate-y-1/2",
  "right-0 top-1/2 -translate-y-1/2",
  "bottom-0 left-[16%]",
  "bottom-0 right-[16%]",
];

function CommunityMark({ platform }: { platform: "instagram" | "whatsapp" }) {
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <span className="relative flex h-10 w-10 items-center justify-center" aria-hidden="true">
      <MessageCircle size={39} strokeWidth={1.8} />
      <Phone size={15} strokeWidth={2} className="absolute" />
    </span>
  );
}

export default function CarePathways({ pathways }: { pathways: PublicCarePathway[] }) {
  const [active, setActive] = useState<number>(pathways[0]?.id ?? 0);
  const detailsRef = useRef<HTMLDivElement>(null);
  const selected = pathways.find((pathway) => pathway.id === active) ?? pathways[0];
  if (!selected) return null;
  const selectedIndex = Math.max(0, pathways.findIndex((pathway) => pathway.id === selected.id));
  const selectedStyle = pathwayStyles[selectedIndex % pathwayStyles.length];

  function explorePathway(pathway: number) {
    setActive(pathway);
    requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <>
      <section id="choose-a-path" className="container section-pad scroll-mt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-red-600">choose a path</span>
          <h2 className="mt-4 text-blue-600">What brings you here today?</h2>
          <p className="mt-5 text-gray-700">
            Choose the starting point that feels closest to what you need right now.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Care pathways">
          {pathways.map((pathway, index) => {
            const style = pathwayStyles[index % pathwayStyles.length];
            const Icon = style.icon;
            const isActive = pathway.id === active;
            return (
              <button
                key={pathway.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => explorePathway(pathway.id)}
                className={`group min-h-72 rounded-xl border-2 p-7 text-left transition duration-200 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-yellow-500 md:p-8 ${
                  isActive
                    ? style.activeCard
                    : "border-blue-100 bg-white text-blue-600 shadow-sm hover:-translate-y-1 hover:border-blue-600 hover:shadow-lg"
                }`}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${isActive ? style.activeIcon : style.soft + " " + style.text}`}>
                  <Icon size={24} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className={`eyebrow mt-8 block ${isActive ? style.activeEyebrow : style.text}`}>
                  {style.eyebrow}
                </span>
                <span className="mt-3 block font-secondary text-3xl font-bold leading-tight">{pathway.title}</span>
                <span className={`mt-4 block leading-relaxed ${isActive ? style.activeDescription : "text-gray-700"}`}>
                  {pathway.shortDescription}
                </span>
                <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold">
                  Explore this path <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>

        <div ref={detailsRef} id="pathway-details" className="mt-8 scroll-mt-24 overflow-hidden rounded-xl border-2 border-blue-100 bg-blue-50" aria-live="polite">
          <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
            <div className="flex flex-col justify-between bg-white p-7 md:p-10">
              <div>
                <span className={`eyebrow ${selectedStyle.text}`}>{selectedStyle.eyebrow}</span>
                <h3 className="mt-3 font-secondary text-3xl font-bold text-blue-600 md:text-4xl">{selected.title}</h3>
                <p className="mt-5 text-gray-700">{selected.shortDescription}</p>
              </div>
              <div className="mt-8 flex items-center gap-3 border-t border-blue-100 pt-6 text-sm font-semibold text-blue-600">
                <span className={`h-2.5 w-2.5 rounded-full ${selectedStyle.accent}`} />
                Selected category
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-3 md:p-8">
              {selected.children.map((item) => {
                const href = `/care/pathways/${item.id}`;
                return (
                  <a
                    key={item.id}
                    href={href}
                    className="group flex flex-col items-start rounded-lg bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:p-6"
                  >
                    <strong className="text-lg text-blue-600">{item.title}</strong>
                    <span className="mt-2 text-sm leading-relaxed text-gray-700">{item.shortDescription}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-blue-50">
        <div className="container section-pad">
          <div className="mx-auto max-w-3xl text-center">
            <span className="eyebrow text-red-600">get connected with your state counterparts</span>
            <h2 className="mt-4 text-blue-600">Find your state. Find your people.</h2>
            <p className="mt-5 text-gray-700">
              Looking for support closer to home? Connect with your state counterparts for local events, updates, resources and a community of Malaysians who know the area.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {communityLinks.map((link) => {
              return (
                <article key={link.key} className="overflow-hidden rounded-2xl border border-blue-100 bg-white p-5 shadow-lg md:p-7">
                  <div className="relative mx-auto h-[390px] max-w-2xl sm:h-[420px] lg:h-[390px]" aria-label={`${link.label} by state`}>
                    <div className="absolute left-1/2 top-1/2 flex w-40 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:w-48 lg:w-60">
                      <span className={`flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20 ${link.logoStyle}`}>
                        <CommunityMark platform={link.key} />
                      </span>
                      <h3 className="mt-3 font-secondary text-xl font-bold text-blue-600 sm:text-2xl">{link.label}</h3>
                      <p className="mt-2 max-w-[10rem] text-xs leading-relaxed text-gray-700 sm:max-w-xs sm:text-sm">{link.description}</p>
                    </div>
                    {states.map((item, index) => {
                      const tileClass = `absolute flex aspect-square w-16 flex-col items-center justify-center gap-1 rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-600 shadow-sm transition sm:w-20 lg:w-24 ${stateBubblePositions[index]}`;
                      if (link.key === "whatsapp") {
                        return (
                          <span key={item.code} aria-disabled="true" title="WhatsApp group link coming soon" className={`${tileClass} cursor-default opacity-55`}>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700"><MessageCircle size={17} aria-hidden="true" /></span>
                            {item.code}
                          </span>
                        );
                      }
                      const query = encodeURIComponent(`MASCA ${item.code} Malaysian students Australia`);
                      const href = item.instagram ?? `https://www.instagram.com/explore/search/keyword/?q=${query}`;
                      return (
                        <a
                          key={item.code}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${item.code} MASCA Instagram`}
                          className={`${tileClass} hover:-translate-y-1 hover:border-pink-200 hover:bg-pink-50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
                        >
                          {item.code}
                        </a>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

    </>
  );
}
