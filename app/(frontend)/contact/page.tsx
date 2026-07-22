import type { Metadata } from "next";

import { pageMetadata } from "@/utils/seo";
import { ContactSection } from "./contactForm";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Get in touch with MASCA — we'd love to hear from you! A real student officer reads every single message.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main>
      <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-32 min-h-80">
        <div className="container flex flex-col gap-24 max-w-2xl space-y-4">
          <span className="text-xs font-bold tracking-widest text-yellow-400 uppercase">
            Send us a message
          </span>
          <p className="text-base leading-relaxed text-blue-100/80 md:text-lg max-w-xl">
            Get in touch with MASCA — we&apos;d love to hear from you! <br/>
            A real student officer reads every single message.
          </p>
        </div>
      </section>

      <ContactSection />
    </main>
  );
}