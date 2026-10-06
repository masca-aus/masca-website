"use client";

import { useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  HeartHandshake,
  Home,
  GraduationCap,
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
    accent: "bg-red-600",
    soft: "bg-red-50",
    text: "text-red-600",
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
    description: "Build confidence in your new place, community, and daily life.",
    icon: Home,
    accent: "bg-red-600",
    soft: "bg-red-50",
    text: "text-red-600",
    items: [
      { title: "Accommodation", detail: "Find a safer next step", icon: Home },
      { title: "Local support", detail: "Connect with your state", icon: MapPin },
      { title: "Community", detail: "Meet people who understand", icon: HeartHandshake },
    ],
  },
] as const;

const states = ["VIC", "NSW", "QLD", "WA", "SA", "ACT", "TAS"];

const advocacySteps = [
  ["01", "Listen", "Students share what they are experiencing."],
  ["02", "Represent", "MASCA turns recurring needs into a clear position."],
  ["03", "Act", "Progress and outcomes come back to the community."],
] as const;

export default function CarePathways() {
  const [active, setActive] = useState<PathwayKey>("wellbeing");
  const [state, setState] = useState("VIC");
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
                    ? "border-blue-600 bg-blue-600 text-white shadow-brand lg:-translate-y-2"
                    : "border-blue-100 bg-white text-blue-600 shadow-sm hover:-translate-y-1 hover:border-blue-600 hover:shadow-lg"
                }`}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${isActive ? "bg-yellow-500 text-blue-900" : pathway.soft + " " + pathway.text}`}>
                  <Icon size={24} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className={`eyebrow mt-8 block ${isActive ? "text-yellow-500" : pathway.text}`}>
                  {pathway.eyebrow}
                </span>
                <span className="mt-3 block font-secondary text-3xl font-bold leading-tight">{pathway.title}</span>
                <span className={`mt-4 block leading-relaxed ${isActive ? "text-blue-100" : "text-gray-700"}`}>
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
        <div className="container section-pad grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="eyebrow text-red-600">near you</span>
            <h2 className="mt-4 max-w-xl text-blue-600">Find your state. Find your people.</h2>
            <p className="mt-5 max-w-xl text-gray-700">
              Connect national guidance with people who understand your local student community.
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg md:p-9">
            <div className="flex flex-wrap gap-2" aria-label="Choose a state or territory">
              {states.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={state === item}
                  onClick={() => setState(item)}
                  className={`min-h-11 rounded-lg px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    state === item ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-6 border-t border-blue-100 pt-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <MapPin size={22} aria-hidden="true" />
                </span>
                <div>
                  <span className="eyebrow text-gray-700">selected chapter</span>
                  <p className="mt-1 font-secondary text-2xl font-bold text-blue-600">MASCA {state}</p>
                </div>
              </div>
              <a href="#quick-support" className="inline-flex min-h-11 items-center gap-2 font-bold text-blue-600 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                View local pathway <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="container section-pad">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-32">
            <span className="eyebrow text-red-600">from listening to action</span>
            <h2 className="mt-4 max-w-xl text-blue-600">Make advocacy feel visible.</h2>
            <p className="mt-5 max-w-xl text-gray-700">
              Follow how student experiences become a shared position and lead to action.
            </p>
          </div>

          <ol className="relative border-l-2 border-blue-100 pl-7 md:pl-10">
            {advocacySteps.map(([number, title, description], index) => (
              <li key={title} className={`${index < 2 ? "pb-10" : ""} relative`}>
                <span className="absolute -left-[2.35rem] top-1 h-4 w-4 rounded-full border-4 border-white bg-red-600 md:-left-[3.1rem]" />
                <span className="eyebrow text-red-600">{number}</span>
                <h3 className="mt-2 font-secondary text-3xl font-bold text-blue-600">{title}</h3>
                <p className="mt-3 text-gray-700">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
