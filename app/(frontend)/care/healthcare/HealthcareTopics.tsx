"use client";

import { useState } from "react";
import Image from "next/image";

const topics = [
  {
    id: "gps",
    label: "GPs and doctors",
    detail:
      "A general practitioner (GP) is often a useful first contact for non-emergency health concerns. GPs can assess your needs and help you understand what care to seek next.",
    nextStep: "Look for a local clinic, check appointment options, and ask whether the clinic bulk bills or has fees before you book.",
    image: { src: "/illustrations/healthcare-gp.svg", alt: "Illustration of a GP clinic and doctor" },
  },
  {
    id: "hospitals",
    label: "Hospitals",
    detail:
      "Hospitals provide emergency and specialist care. For a life-threatening emergency in Australia, call Triple Zero (000). For non-emergency concerns, contact a GP or health advice service first.",
    nextStep: "If you are unsure where to go, contact a health advice service or your local clinic for guidance.",
    image: { src: "/illustrations/healthcare-hospital.svg", alt: "Illustration of a hospital and ambulance" },
  },
  {
    id: "finding-care",
    label: "Finding the right care",
    detail:
      "Your university health service, a local GP clinic, or a community health centre can help you find care that suits your situation.",
    nextStep: "Before your appointment, check what identification and health cover details to bring, and ask about costs if you are unsure.",
    image: null,
  },
] as const;

const additionalLinks = [
  { label: "GP and doctor finder", href: "https://example.com/healthcare/gps" },
  { label: "Hospital information", href: "https://example.com/healthcare/hospitals" },
  { label: "Student health support", href: "https://example.com/healthcare/student-support" },
];

export default function HealthcareTopics() {
  const [activeTopicId, setActiveTopicId] = useState<(typeof topics)[number]["id"]>(topics[0].id);
  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0];

  return (
    <>
      <section className="bg-blue-50">
        <div className="container section-pad">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-[17rem_minmax(0,1fr)]">
            <div role="tablist" aria-label="Healthcare topics" className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
              {topics.map((topic, index) => {
                const selected = topic.id === activeTopicId;
                return (
                  <button
                    key={topic.id}
                    id={`healthcare-tab-${topic.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="healthcare-topic-panel"
                    onClick={() => setActiveTopicId(topic.id)}
                    className={`flex min-h-14 items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                      selected ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${selected ? "bg-yellow-500 text-blue-900" : "bg-blue-50 text-blue-600"}`}>
                      0{index + 1}
                    </span>
                    {topic.label}
                  </button>
                );
              })}
            </div>

            <article
              id="healthcare-topic-panel"
              role="tabpanel"
              aria-labelledby={`healthcare-tab-${activeTopic.id}`}
              className="min-h-80 rounded-xl border border-blue-100 bg-white p-7 shadow-sm md:p-10"
            >
              <span className="eyebrow text-red-600">healthcare in Australia</span>
              <h2 className="mt-4 text-blue-600">{activeTopic.label}</h2>
              <div className={`mt-5 grid items-center gap-6 ${activeTopic.image ? "md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.85fr)]" : ""}`}>
                <p className="max-w-2xl leading-relaxed text-gray-700">{activeTopic.detail}</p>
                {activeTopic.image ? (
                  <Image
                    src={activeTopic.image.src}
                    alt={activeTopic.image.alt}
                    width={640}
                    height={360}
                    className="h-auto w-full rounded-xl"
                  />
                ) : null}
              </div>
              <div className="mt-8 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-5">
                <h3 className="font-secondary text-xl font-bold text-blue-600">A helpful next step</h3>
                <p className="mt-2 leading-relaxed text-gray-700">{activeTopic.nextStep}</p>
              </div>
              <button
                type="button"
                disabled
                className="mt-6 inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-400"
                aria-label={`Download PDF for ${activeTopic.label} (sample button)`}
              >
                Download PDF <span aria-hidden="true">↓</span>
              </button>
            </article>
          </div>
        </div>
      </section>

      <section id="additional-links" aria-labelledby="healthcare-links-heading" className="bg-white">
        <div className="container section-pad">
          <div className="mx-auto max-w-6xl">
            <span className="eyebrow text-red-600">keep exploring</span>
            <h2 id="healthcare-links-heading" className="mt-4 text-blue-600">Additional links</h2>
            <p className="mt-4 text-gray-700">Explore more on these topics.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {additionalLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-blue-100 bg-blue-50 p-5 font-bold text-blue-600 transition hover:border-blue-600 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {link.label}<span className="ml-2" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
