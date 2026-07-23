import type { Metadata } from "next";

import { pageMetadata } from "@/utils/seo";

export const metadata: Metadata = pageMetadata({
  title: "Care",
  description:
    "MASCA Care offers free, confidential support from trained MASCA student leaders — visa worries, mental health, accommodation and more. No judgement.",
  path: "/care",
});

export default function MascaCarePage() {
  return (
    <main id="main">
      <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-32 min-h-80">
        <div className="container flex flex-col gap-24 max-w-2xl space-y-4">
          <span className="text-xs font-bold tracking-widest text-yellow-400 uppercase">
            The CARE
          </span>
          <p className="text-base leading-relaxed text-blue-100/80 md:text-lg max-w-xl">
            What is masca care? Are we able to make it more accessible here? If so, how do we do it? Chat function? 
          </p>
        </div>
      </section>
    </main>
  )
}
