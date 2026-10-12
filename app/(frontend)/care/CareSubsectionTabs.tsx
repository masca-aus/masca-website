"use client";

import { useState } from "react";
import type { PublicCareSubsection } from "@/features/care/publicCarePathways";

export default function CareSubsectionTabs({
  title,
  subsections,
}: {
  title: string;
  subsections: PublicCareSubsection[];
}) {
  const [activeId, setActiveId] = useState(subsections[0]?.id ?? "");
  const active = subsections.find((section) => section.id === activeId) ?? subsections[0];

  if (!subsections.length) {
    return (
      <section className="bg-blue-50">
        <div className="container section-pad">
          <p className="mx-auto max-w-3xl text-center text-gray-700">More information for this section is coming soon.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-blue-50">
        <div className="container section-pad">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-[17rem_minmax(0,1fr)]">
            <div role="tablist" aria-label={`${title} topics`} className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
              {subsections.map((section, index) => {
                const selected = section.id === active.id;
                return (
                  <button
                    key={section.id}
                    id={`care-tab-${section.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="care-topic-panel"
                    onClick={() => setActiveId(section.id)}
                    className={`flex min-h-14 items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${selected ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-50"}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${selected ? "bg-yellow-500 text-blue-900" : "bg-blue-50 text-blue-600"}`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </button>
                );
              })}
            </div>

            <article
              id="care-topic-panel"
              role="tabpanel"
              aria-labelledby={`care-tab-${active.id}`}
              className="min-h-80 rounded-xl border border-blue-100 bg-white p-7 shadow-sm md:p-10"
            >
              <span className="eyebrow text-red-600">{title}</span>
              <h2 className="mt-4 text-blue-600">{active.title}</h2>
              {active.shortDescription ? <p className="mt-5 max-w-2xl font-semibold leading-relaxed text-gray-700">{active.shortDescription}</p> : null}
              <div className={`mt-5 grid items-center gap-6 ${active.image ? "md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.85fr)]" : ""}`}>
                <p className="max-w-2xl whitespace-pre-line leading-relaxed text-gray-700">{active.detail || "More information for this topic is coming soon."}</p>
                {active.image ? (
                  // Uploads are served from the configured public Supabase Storage bucket.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={active.image.url} alt={active.image.alt} className="h-auto w-full rounded-xl" />
                ) : null}
              </div>
            </article>
          </div>
        </div>
      </section>

      {active.links.length ? (
        <section id="additional-links" aria-labelledby="care-links-heading" className="bg-white">
          <div className="container section-pad">
            <div className="mx-auto max-w-6xl">
              <span className="eyebrow text-red-600">keep exploring</span>
              <h2 id="care-links-heading" className="mt-4 text-blue-600">Additional links</h2>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {active.links.map((link) => {
                  const external = /^https:\/\//i.test(link.url);
                  return (
                    <a key={link.id} href={link.url} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="rounded-lg border border-blue-100 bg-blue-50 p-5 font-bold text-blue-600 transition hover:border-blue-600 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                      {link.label}<span className="ml-2" aria-hidden="true">{external ? "↗" : "→"}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
