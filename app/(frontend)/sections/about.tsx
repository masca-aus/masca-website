import Button from "@/components/Button"
import CommunityPhotoCarousel, { type CarouselPhoto } from "../_components/CommunityPhotoCarousel"

const DIALEKTOS_URL =
  "https://mascavoice.kit.com/posts/dialektos-ep1-beyond-the-bubble-with-john-ng-masca-national-chairperson-25-26"

const photos = [
  { src: "/community/malead-2026-hero.webp", alt: "MALEAD 2026 student leaders together at Malaysian Hall", caption: "MALEAD 2026 · Student leaders together" },
  { src: "/community/anls-2025-community.webp", alt: "Three students together at ANLS 2025", caption: "ANLS 2025 · New connections" },
  { src: "/community/malead-2026-hero-2.webp", alt: "MALEAD 2026 delegates gathered during a group session", caption: "MALEAD 2026 · Across the community" },
  { src: "/community/anls-2025-community-2.webp", alt: "Students networking at ANLS 2025", caption: "ANLS 2025 · Sharing the moment" },
  { src: "/community/malead-2026-hero-3.webp", alt: "MALEAD 2026 students talking together", caption: "MALEAD 2026 · Conversations that connect" },
  { src: "/community/anls-2025-community-3.webp", alt: "Students talking around a table at ANLS 2025", caption: "ANLS 2025 · Around the table" },
] satisfies readonly CarouselPhoto[]

export default function AboutSection() {
  return (
    <section>
      <div className="container section-pad grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6 lg:order-2">
          <header className="flex flex-col gap-3">
            <span className="eyebrow text-red-600">Who we are</span>
            <h2 className="title text-blue-600">Beyond the bubble</h2>
          </header>

          <figure className="flex flex-col gap-2 border-l-4 border-yellow-500 pl-5">
            <blockquote className="font-secondary text-xl italic leading-snug text-blue-600 md:text-2xl">
              “Don&apos;t stay in your bubble —{" "}
              <span className="underline decoration-yellow-500 decoration-[3px] underline-offset-4">
                build a bigger one
              </span>
              .”
            </blockquote>
            <figcaption className="text-caption text-gray-700">
              —{" "}
              <a
                href={DIALEKTOS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-600 underline-offset-2 transition-colors hover:text-red-600 hover:underline"
              >
                John Ng
              </a>
              , National Chairperson &rsquo;25/26
            </figcaption>
          </figure>

          <p className="text-gray-700">
            MASCA isn&apos;t really a club — it&apos;s the bridges between them. We link
            campus bubbles across universities and states, so a country this big can
            still feel like home.
          </p>
          <p className="text-gray-700">
            We&apos;re the keeper of the campfire — the wood, the shelter, and the
            continuity that keeps it burning, year after year.
          </p>
          <Button variant="accent" href="/about" className="self-start mt-2">
            Our full story <span aria-hidden>&rarr;</span>
          </Button>
        </div>

        <div className="relative w-full overflow-hidden rounded-xl bg-blue-900 shadow-brand aspect-[5/4] lg:order-1">
          <CommunityPhotoCarousel
            label="MALEAD and ANLS community photos"
            photos={photos}
            sizes="(max-width: 1024px) 92vw, 42vw"
            autoPlay
          />
        </div>
      </div>
    </section>
  )
}
