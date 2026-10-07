"use client";

import { useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Facebook,
  HeartHandshake,
  Home,
  GraduationCap,
  Instagram,
  MapPin,
  Scale,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

type PathwayKey = "wellbeing" | "finance" | "academic" | "settling";

const pathways = [
  {
    key: "wellbeing" as const,
    eyebrow: "Start here",
    title: "Wellbeing",
    description: "Make space for your wellbeing and find a supportive next step.",
    icon: Sparkles,
    accent: "bg-blue-600",
    soft: "bg-blue-50",
    text: "text-blue-600",
    activeCard: "border-blue-600 bg-blue-600 text-white shadow-brand lg:-translate-y-2",
    activeIcon: "bg-yellow-500 text-blue-900",
    activeEyebrow: "text-yellow-500",
    activeDescription: "text-blue-100",
    items: [
      { title: "Wellbeing", detail: "Start with how you are feeling", icon: Sparkles },
      { title: "Accommodation", detail: "Find a safer next step", icon: Home },
      { title: "Local support", detail: "Connect with your state", icon: MapPin },
    ],
  },
  {
    key: "finance" as const,
    eyebrow: "Plan ahead",
    title: "Finance",
    description: "Get a clearer view of costs, options, and practical support.",
    icon: WalletCards,
    accent: "bg-yellow-500",
    soft: "bg-yellow-50",
    text: "text-yellow-800",
    activeCard: "border-yellow-500 bg-yellow-500 text-blue-900 shadow-brand lg:-translate-y-2",
    activeIcon: "bg-blue-600 text-white",
    activeEyebrow: "text-blue-800",
    activeDescription: "text-blue-900",
    items: [
      { title: "Budgeting", detail: "Make your money go further", icon: WalletCards },
      { title: "Work and income", detail: "Explore practical options", icon: BriefcaseBusiness },
      { title: "Financial support", detail: "Find a place to begin", icon: ShieldCheck },
    ],
  },
  {
    key: "academic" as const,
    eyebrow: "Keep moving",
    title: "Academic",
    description: "Find support that helps you stay connected to your study goals.",
    icon: GraduationCap,
    accent: "bg-blue-600",
    soft: "bg-blue-50",
    text: "text-blue-600",
    activeCard: "border-blue-600 bg-blue-600 text-white shadow-brand lg:-translate-y-2",
    activeIcon: "bg-yellow-500 text-blue-900",
    activeEyebrow: "text-yellow-500",
    activeDescription: "text-blue-100",
    items: [
      { title: "Study support", detail: "Get back into your rhythm", icon: GraduationCap },
      { title: "Your options", detail: "Understand the next step", icon: Scale },
      { title: "Campus connection", detail: "Find help close to you", icon: MapPin },
    ],
  },
  {
    key: "settling" as const,
    eyebrow: "Find your footing",
    title: "Settling in",
    description: "Just landed in Australia? Get the essentials you need to settle in, find your feet, and survive those first few weeks away from home.",
    icon: Home,
    accent: "bg-yellow-500",
    soft: "bg-yellow-50",
    text: "text-yellow-800",
    activeCard: "border-yellow-500 bg-yellow-500 text-blue-900 shadow-brand lg:-translate-y-2",
    activeIcon: "bg-blue-600 text-white",
    activeEyebrow: "text-blue-800",
    activeDescription: "text-blue-900",
    items: [
      { title: "Accommodation", detail: "Find a safer next step", icon: Home },
      { title: "Local support", detail: "Connect with your state", icon: MapPin },
      { title: "Community", detail: "Meet people who understand", icon: HeartHandshake },
    ],
  },
] as const;

const states = [
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
    icon: Instagram,
    colour: "bg-pink-50 text-pink-600",
  },
  {
    key: "facebook",
    label: "Facebook",
    description: "Meet, connect & support! Join the group to make new friends, ask questions, share tips, and find your people in the community.",
    icon: Facebook,
    colour: "bg-blue-50 text-blue-600",
  },
] as const;

export default function CarePathways() {
  const [active, setActive] = useState<PathwayKey>("wellbeing");
  const selected = pathways.find((pathway) => pathway.key === active) ?? pathways[0];

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
          {pathways.map((pathway) => {
            const Icon = pathway.icon;
            const isActive = pathway.key === active;
            return (
              <button
                key={pathway.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActive(pathway.key)}
                className={`group min-h-72 rounded-xl border-2 p-7 text-left transition duration-200 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-yellow-500 md:p-8 ${
                  isActive
                    ? pathway.activeCard
                    : "border-blue-100 bg-white text-blue-600 shadow-sm hover:-translate-y-1 hover:border-blue-600 hover:shadow-lg"
                }`}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${isActive ? pathway.activeIcon : pathway.soft + " " + pathway.text}`}>
                  <Icon size={24} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className={`eyebrow mt-8 block ${isActive ? pathway.activeEyebrow : pathway.text}`}>
                  {pathway.eyebrow}
                </span>
                <span className="mt-3 block font-secondary text-3xl font-bold leading-tight">{pathway.title}</span>
                <span className={`mt-4 block leading-relaxed ${isActive ? pathway.activeDescription : "text-gray-700"}`}>
                  {pathway.description}
                </span>
                <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold">
                  Explore this path <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border-2 border-blue-100 bg-blue-50" aria-live="polite">
          <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
            <div className="flex flex-col justify-between bg-white p-7 md:p-10">
              <div>
                <span className={`eyebrow ${selected.text}`}>{selected.eyebrow}</span>
                <h3 className="mt-3 font-secondary text-3xl font-bold text-blue-600 md:text-4xl">{selected.title}</h3>
                <p className="mt-5 text-gray-700">Browse a few common starting points, then take the next step that feels right for you.</p>
              </div>
              <div className="mt-8 flex items-center gap-3 border-t border-blue-100 pt-6 text-sm font-semibold text-blue-600">
                <span className={`h-2.5 w-2.5 rounded-full ${selected.accent}`} />
                Selected pathway
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-3 md:p-8">
              {selected.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.title}
                    href="#quick-support"
                    className="group flex min-h-52 flex-col rounded-lg bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    <span className="flex items-center justify-between text-blue-600">
                      <Icon size={23} aria-hidden="true" />
                      <span className="font-secondary text-lg font-bold text-blue-100">0{index + 1}</span>
                    </span>
                    <strong className="mt-auto pt-8 text-lg text-blue-600">{item.title}</strong>
                    <span className="mt-2 text-sm leading-relaxed text-gray-700">{item.detail}</span>
                    <ArrowRight size={18} className="mt-5 text-red-600 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-yellow-50">
        <div className="container section-pad">
          <div className="mx-auto max-w-3xl text-center">
            <span className="eyebrow text-red-600">get connected with your state counterparts</span>
            <h2 className="mt-4 text-blue-600">Find your state. Find your people.</h2>
            <p className="mt-5 text-gray-700">
              Looking for support closer to home? Connect with your state counterparts for local events, updates, resources and a community of Malaysians who know the area.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {communityLinks.map((link) => {
              const Icon = link.icon;
              return (
                <article key={link.key} className="rounded-xl border border-blue-100 bg-white p-6 shadow-lg md:p-8">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${link.colour}`}>
                    <Icon size={24} aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 font-secondary text-2xl font-bold text-blue-600">{link.label}</h3>
                  <p className="mt-2 min-h-14 text-sm leading-relaxed text-gray-700">{link.description}</p>
                  <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={`${link.label} by state`}>
                    {states.map((item) => {
                      const query = encodeURIComponent(`MASCA ${item.code} Malaysian students Australia`);
                      const href = link.key === "instagram"
                        ? item.instagram ?? `https://www.instagram.com/explore/search/keyword/?q=${query}`
                        : `https://www.facebook.com/search/top?q=${query}`;
                      return (
                        <a
                          key={item.code}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 text-sm font-bold text-blue-600 transition hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          MASCA {item.code}<ArrowRight size={15} aria-hidden="true" />
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
