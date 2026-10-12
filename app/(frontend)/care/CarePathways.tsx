"use client";

import { useRef, useState } from "react";
import {
  ArrowRight, HeartHandshake, type LucideIcon,
} from "lucide-react";
import type { PublicCarePathway } from "@/features/care/publicCarePathways";

type PathwayStyle = { eyebrow: string; icon: LucideIcon; accent: string; soft: string; text: string; activeCard: string; activeIcon: string; activeEyebrow: string; activeDescription: string };

const pathwayStyles: PathwayStyle[] = [
  { eyebrow: "Start here", icon: HeartHandshake, accent: "bg-blue-600", soft: "bg-blue-50", text: "text-blue-600", activeCard: "border-blue-600 bg-blue-600 text-white shadow-brand lg:-translate-y-2", activeIcon: "bg-yellow-500 text-blue-900", activeEyebrow: "text-yellow-500", activeDescription: "text-blue-100" },
  { eyebrow: "Plan ahead", icon: HeartHandshake, accent: "bg-yellow-500", soft: "bg-yellow-50", text: "text-yellow-800", activeCard: "border-yellow-500 bg-yellow-500 text-blue-900 shadow-brand lg:-translate-y-2", activeIcon: "bg-blue-600 text-white", activeEyebrow: "text-blue-800", activeDescription: "text-blue-900" },
  { eyebrow: "Find your footing", icon: HeartHandshake, accent: "bg-yellow-500", soft: "bg-yellow-50", text: "text-yellow-800", activeCard: "border-yellow-500 bg-yellow-500 text-blue-900 shadow-brand lg:-translate-y-2", activeIcon: "bg-blue-600 text-white", activeEyebrow: "text-blue-800", activeDescription: "text-blue-900" },
  { eyebrow: "Keep moving", icon: HeartHandshake, accent: "bg-blue-600", soft: "bg-blue-50", text: "text-blue-600", activeCard: "border-blue-600 bg-blue-600 text-white shadow-brand lg:-translate-y-2", activeIcon: "bg-yellow-500 text-blue-900", activeEyebrow: "text-yellow-500", activeDescription: "text-blue-100" },
];

const states = [
  { code: "VIC", name: "Victoria", instagram: "https://www.instagram.com/mascavic/", whatsapp: "https://chat.whatsapp.com/F99qWymqU5O4KA0sMOekTf", landmark: "station" },
  { code: "NSW", name: "New South Wales", instagram: "https://www.instagram.com/masca_nsw/", landmark: "opera" },
  { code: "QLD", name: "Queensland", landmark: "bridge" },
  { code: "WA", name: "Western Australia", landmark: "tower" },
  { code: "SA", name: "South Australia", landmark: "cathedral" },
  { code: "ACT", name: "Australian Capital Territory", landmark: "parliament" },
  { code: "TAS", name: "Tasmania", landmark: "mountain" },
] as const;

function StateArtwork({ landmark }: { landmark: (typeof states)[number]["landmark"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 3 };

  switch (landmark) {
    case "station":
      return <svg viewBox="0 0 100 64" className="h-12 w-16" aria-hidden="true"><g {...common}><path d="M12 55h76M20 55V35h60v20M15 35h70M35 35V19q15-17 30 0v16M35 19q15-22 30 0M50 12V6M29 43h10m22 0h10M44 55V45q6-10 12 0v10" /></g><path d="M50 18v9m-5-5h10" stroke="currentColor" strokeWidth="2" /></svg>;
    case "opera":
      return <svg viewBox="0 0 100 64" className="h-12 w-16" aria-hidden="true"><g {...common}><path d="M12 51h76M17 46h66M22 46q-5-18-13-22 25 0 38 22M47 46q-8-27-3-40 26 14 30 40M44 6l4 40M71 46q-7-20 5-36 16 19 13 36M76 10l-5 36" /></g></svg>;
    case "bridge":
      return <svg viewBox="0 0 100 64" className="h-12 w-16" aria-hidden="true"><g {...common}><path d="M8 49h84M13 54h74M25 54V26h5v28m40 0V26h5v28M22 26h11m34 0h11M10 49l15-19 25 19 25-19 15 19M10 49h80M38 39v10m24-10v10" /></g></svg>;
    case "tower":
      return <svg viewBox="0 0 100 64" className="h-12 w-16" aria-hidden="true"><g {...common}><path d="M12 55h76M35 55l10-42h10l10 42M45 13V7h10v6M39 37h22m-19 9h16M43 27h14M30 55q2-16 10-20m30 20q-2-16-10-20" /></g><circle cx="50" cy="10" r="3" fill="currentColor" /></svg>;
    case "cathedral":
      return <svg viewBox="0 0 100 64" className="h-12 w-16" aria-hidden="true"><g {...common}><path d="M10 55h80M22 55V29h18v26m20 0V29h18v26M19 29l12-22 12 22m14 0L69 7l12 22M31 7V3m-4 5h8m34-1V3m-4 5h8M40 42l10-10 10 10M40 45h20M46 55V46q4-8 8 0v9" /></g><circle cx="50" cy="43" r="3" fill="currentColor" /></svg>;
    case "parliament":
      return <svg viewBox="0 0 100 64" className="h-12 w-16" aria-hidden="true"><g {...common}><path d="M9 55h82M17 55l13-12h40l13 12M26 43h48M30 49v6m10-6v6m10-6v6m10-6v6m10-6v6M38 43l12-31 12 31M50 12V5l11 4-11 4" /></g></svg>;
    case "mountain":
      return <svg viewBox="0 0 100 64" className="h-12 w-16" aria-hidden="true"><g {...common}><path d="M7 54h86L70 23l-9 6-13-22-12 26-7-6zM35 33l7 7 6-11 9 11 7-4M21 57q19 6 38 0t34 0" /></g></svg>;
  }
}

function CommunityMark({ platform }: { platform: "instagram" | "whatsapp" }) {
  if (platform === "instagram") {
    return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none" /></svg>;
  }

  return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.8 11.8 0 0 0 12.1 0C5.55 0 .22 5.33.22 11.88c0 2.1.55 4.15 1.6 5.96L.12 24l6.32-1.66a11.9 11.9 0 0 0 5.66 1.44h.01c6.55 0 11.88-5.33 11.88-11.88a11.8 11.8 0 0 0-3.47-8.42ZM12.1 21.75a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.23-.38a9.85 9.85 0 1 1 8.38 4.64Zm5.41-7.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.62.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" /></svg>;
}

export default function CarePathways({ pathways }: { pathways: PublicCarePathway[] }) {
  const [active, setActive] = useState<number>(pathways[0]?.id ?? 0);
  const [activeState, setActiveState] = useState<(typeof states)[number]["code"] | null>(null);
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
                  {pathway.header || style.eyebrow}
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
                <span className={`eyebrow ${selectedStyle.text}`}>{selected.header || selectedStyle.eyebrow}</span>
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

          <div className="mx-auto mt-12 max-w-5xl">
            <div className="relative overflow-visible rounded-[2rem] border-2 border-blue-200 bg-[#fff9e9] px-5 py-8 shadow-xl sm:px-10 sm:py-10">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full text-amber-800/20" fill="none" aria-hidden="true">
                <path d="M1 2 50 44 99 2M1 98 36 58M99 98 64 58M1 2v96h98V2" stroke="currentColor" strokeWidth=".7" />
              </svg>
              <div className="relative z-10">
                <p className="mb-7 text-center text-sm font-semibold tracking-wide text-blue-800">Choose a state stamp to open its community links</p>
                <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-8 sm:gap-y-10">
                  {states.map((item) => {
                    const isSelected = activeState === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        aria-label={`Open ${item.name} community links`}
                        aria-pressed={isSelected}
                        aria-expanded={isSelected}
                        aria-controls="state-community-links"
                        onClick={() => setActiveState(isSelected ? null : item.code)}
                        className={`group relative z-10 flex w-full max-w-32 flex-col items-center rounded-lg border-2 border-dashed p-2 transition duration-200 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-600 hover:z-20 hover:-translate-y-2 hover:scale-105 hover:shadow-xl focus-visible:z-20 focus-visible:-translate-y-2 ${isSelected ? "z-20 -translate-y-2 scale-105 border-blue-600 bg-white shadow-xl" : "border-amber-300 bg-white/95 shadow-md"}`}
                      >
                        <span className={`absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow transition ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
                          {item.name}
                        </span>
                        <span className="flex h-20 w-full flex-col items-center justify-center rounded-md bg-blue-50 text-blue-700">
                          <StateArtwork landmark={item.landmark} />
                        </span>
                        <span className="mt-2 font-secondary text-xl font-bold tracking-wide text-blue-800">{item.code}</span>
                        <span className="mt-1 text-[9px] font-bold uppercase tracking-[.18em] text-amber-700">MASCA · AU</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {!activeState && <div id="state-community-links" hidden />}
            {activeState && (() => {
              const item = states.find((state) => state.code === activeState);
              if (!item) return null;
              const query = encodeURIComponent(`MASCA ${item.name} Malaysian students Australia`);
              const instagram = "instagram" in item && item.instagram ? item.instagram : `https://www.instagram.com/explore/search/keyword/?q=${query}`;
              const whatsapp = "whatsapp" in item ? item.whatsapp : undefined;
              return (
                <div id="state-community-links" className="mt-5 flex flex-col items-center gap-5 rounded-2xl border-2 border-blue-200 bg-white p-6 text-center shadow-lg sm:flex-row sm:justify-between sm:px-8">
                  <div>
                    <span className="eyebrow text-red-600">stamp opened</span>
                    <h3 className="mt-2 font-secondary text-2xl font-bold text-blue-600">{item.name}</h3>
                    <p className="mt-1 text-sm text-gray-700">Choose how you&apos;d like to connect.</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 px-5 py-3 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                      <CommunityMark platform="instagram" /> Instagram
                    </a>
                    {whatsapp ? (
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                        <CommunityMark platform="whatsapp" /> WhatsApp
                      </a>
                    ) : (
                      <span aria-disabled="true" title="WhatsApp group link coming soon" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-green-700/45 px-5 py-3 font-bold text-white">
                        <CommunityMark platform="whatsapp" /> WhatsApp <span className="text-xs font-medium">Coming soon</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

    </>
  );
}
