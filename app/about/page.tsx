import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | MASCA",
  description: ""
};

export default function AboutUsPage() {
  return (
    <main>
      <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-32 min-h-80">
        <div className="container flex flex-col gap-24 max-w-2xl space-y-4">
          <span className="text-xs font-bold tracking-widest text-yellow-400 uppercase">
            The Story
          </span>
          <p className="text-base leading-relaxed text-blue-100/80 md:text-lg max-w-xl">
            What really is MASCA? this section will explain what MASCA really is, 
            for both committee members for reminders and any stakeholders.
            Include sections like the pillars and what each of them does (amplifies, care, ambition etc.),
            our challenges (e.g. one-year leadership terms solution: a alumni network)
            and more...
          </p>
        </div>
      </section>
    </main>
  )
}
