'use client'

import { useRef } from "react";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export default function StatisticSection() {
  const stats = [
    { from: 0, value: 33, suffix: "k+", label: "students reached" },
    { from: 0, value: 7, suffix: "", label: "state chapters" },
    { from: new Date().getFullYear(), value: 2001, suffix: "", label: "founded" },
  ]
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const values = gsap.utils.toArray<HTMLElement>(".stat-value");
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      values.forEach((e) => {
        const target = Number(e.dataset.value);
        const from = Number(e.dataset.from);
        const suffix = e.dataset.suffix ?? "";
        const proxy = { val: from };
        gsap.to(proxy, {
          val: target,
          duration: 5,
          ease: "power4.out",
          onUpdate: () => { e.textContent = `${Math.round(proxy.val)}${suffix}`; },
        });
      });
    });

    // Reduced motion: no ticking numbers, just the final figures.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      values.forEach((e) => {
        e.textContent = `${e.dataset.value}${e.dataset.suffix ?? ""}`;
      });
    });
  }, { scope: rootRef });

  return (
    <section ref={rootRef} className="bg-blue-600">
      <div className="container pb-16">
        <div className="flex justify-between gap-4 border-t pt-8 border-blue-100/20">
          {stats.map(({ from, value, suffix, label }) => (
            <div key={label} className="flex flex-col">
              <span
                className="stat-value text-h2 font-bold text-yellow-500"
                data-value={value}
                data-from={from}
                data-suffix={suffix}
              >
                {from}{suffix}
              </span>
              <span className="eyebrow text-gray-300">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
