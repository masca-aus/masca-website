"use client";

import { useState } from "react";

const topics = [
  {
    id: "gps",
    label: "GPs and doctors",
    detail:
      "A general practitioner (GP) is often a useful first contact for non-emergency health concerns. GPs can assess your needs and help you understand what care to seek next.",
    nextStep: "Look for a local clinic, check appointment options, and ask whether the clinic bulk bills or has fees before you book.",
  },
  {
    id: "hospitals",
    label: "Hospitals",
    detail:
      "Hospitals provide emergency and specialist care. For a life-threatening emergency in Australia, call Triple Zero (000). For non-emergency concerns, contact a GP or health advice service first.",
    nextStep: "If you are unsure where to go, contact a health advice service or your local clinic for guidance.",
  },
  {
    id: "finding-care",
    label: "Finding the right care",
    detail:
      "Your university health service, a local GP clinic, or a community health centre can help you find care that suits your situation.",
    nextStep: "Before your appointment, check what identification and health cover details to bring, and ask about costs if you are unsure.",
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
              <p className="mt-5 max-w-2xl leading-relaxed text-gray-700">{activeTopic.detail}</p>
              <div className="mt-8 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-5">
                <h3 className="font-secondary text-xl font-bold text-blue-600">A helpful next step</h3>
                <p className="mt-2 leading-relaxed text-gray-700">{activeTopic.nextStep}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-yellow-50">
        <div className="container flex flex-col items-start justify-between gap-5 py-12 md:flex-row md:items-center">
          <div>
            <span className="eyebrow text-red-600">need another kind of support?</span>
            <h2 className="mt-3 text-blue-600">Explore other Cares pathways.</h2>
          </div>
          <a href="/care#choose-a-path" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            Back to Cares
          </a>
        </div>
      </section>

      <section id="additional-links" aria-labelledby="healthcare-links-heading" className="bg-white">
        <div className="container section-pad">
          <div className="mx-auto max-w-6xl">
            <span className="eyebrow text-red-600">keep exploring</span>
            <h2 id="healthcare-links-heading" className="mt-4 text-blue-600">Additional links</h2>
            <p className="mt-4 text-gray-700">Placeholder links for healthcare resources. These can be replaced with verified resources later.</p>
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
