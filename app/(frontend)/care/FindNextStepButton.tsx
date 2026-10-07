"use client";

import type { MouseEvent } from "react";

export default function FindNextStepButton() {
  function scrollToPathways(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById("choose-a-path");
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.location.hash !== "#choose-a-path") {
      window.history.pushState(null, "", "#choose-a-path");
    }
  }

  return (
    <a
      href="#choose-a-path"
      onClick={scrollToPathways}
      className="inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-lg bg-yellow-500 px-5 py-3 text-sm font-bold text-blue-900 shadow-accent transition-all hover:bg-yellow-800 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-800"
    >
      Find your next step <span aria-hidden>&rarr;</span>
    </a>
  );
}
