import type { Metadata } from "next";

import { pageMetadata } from "@/utils/seo";

export const metadata: Metadata = pageMetadata({
  title: "MASCA Care",
  description:
    "MASCA Care is confidential, free student support staffed by trained MASCA student leaders. Whether it's visa worries, mental health, or accommodation, we're here to listen and connect you to help — no judgement, no paperwork, no problem too small.",
  path: "/care",
});

export default function MascaCarePage() {
  return (
    <main>
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
