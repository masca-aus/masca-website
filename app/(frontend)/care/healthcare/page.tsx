import type { Metadata } from "next";

import { pageMetadata } from "@/utils/seo";
import HealthcareTopics from "./HealthcareTopics";

export const metadata: Metadata = pageMetadata({
  title: "Healthcare Support",
  description: "Explore healthcare starting points for Malaysian students in Australia.",
  path: "/care/healthcare",
});

export default function HealthcarePage() {
  return (
    <main id="main" className="overflow-hidden bg-white">
      <section className="bg-blue-600 pb-16 pt-36 text-white md:pb-20 md:pt-44">
        <div className="container">
          <a href="/care#choose-a-path" className="text-sm font-bold text-yellow-500 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            &larr; Back to Cares
          </a>
          <div className="mt-8 max-w-3xl">
            <span className="eyebrow text-yellow-500">wellbeing · healthcare</span>
            <h1 className="mt-4 text-5xl text-white sm:text-6xl">Healthcare in Australia</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-blue-100">
              Explore common starting points for finding a doctor, hospital or other health service.
            </p>
          </div>
        </div>
      </section>

      <HealthcareTopics />
    </main>
  );
}
