import Button from "@/components/Button";

// Construction-site take on the placeholder band, built entirely on design
// tokens: blueprint grid ground, crossed caution tapes in accent yellow and
// brand blue, a striped site-progress bar, and traffic cones in brand red.
// Animations are CSS-only and switch off under prefers-reduced-motion.

const HAZARD_STRIPES = {
  backgroundImage:
    "repeating-linear-gradient(-45deg, var(--color-yellow-500) 0 14px, var(--color-blue-900) 14px 28px)",
} as const;

// Equal-width four-stop pattern so background-position loops seamlessly at
// exactly one background-size period.
const PROGRESS_STRIPES = {
  backgroundImage:
    "linear-gradient(45deg, var(--color-yellow-500) 25%, var(--color-blue-900) 25%, var(--color-blue-900) 50%, var(--color-yellow-500) 50%, var(--color-yellow-500) 75%, var(--color-blue-900) 75%)",
  backgroundSize: "1.25rem 1.25rem",
} as const;

const BLUEPRINT_GRID = {
  backgroundImage:
    "linear-gradient(var(--color-blue-100) 1px, transparent 1px), linear-gradient(90deg, var(--color-blue-100) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
  maskImage:
    "radial-gradient(ellipse 90% 75% at 50% 45%, black 30%, transparent 85%)",
} as const;

export default function UnderConstruction() {
  return (
    <main id="main">
      <section className="relative flex flex-col justify-center overflow-hidden bg-white py-36 md:py-44">
        {/* Blueprint-paper grid, fading out toward the section edges */}
        <div aria-hidden className="absolute inset-0" style={BLUEPRINT_GRID} />

        <CautionTapes />

        <div className="container relative flex flex-col items-center gap-6 text-center">
          <span className="eyebrow flex items-center gap-2 text-red-600">
            <HardHatIcon className="size-4" />
            pardon our dust
          </span>
          <h1 className="max-w-3xl text-blue-600 text-4xl md:text-5xl lg:text-6xl">
            This page is{" "}
            <span className="font-accent font-normal text-red-600">
              under construction
            </span>
          </h1>
          <p className="max-w-xl text-gray-700 md:text-lg">
            Hard hats on — we&apos;re still building this corner of the site.
            Check back soon, we&apos;d love to show you what we&apos;re putting
            up.
          </p>

          <SiteProgress />

          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Button href="/" variant="primary">
              Back to home <span aria-hidden>&rarr;</span>
            </Button>
            <Button href="/contact" variant="outline">
              Get in touch
            </Button>
          </div>
        </div>

        {/* Cones parked at the barricade, desktop only */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-3 right-8 hidden items-end gap-3 md:flex"
        >
          <Cone id="uc-cone-sm" className="w-12 opacity-80" />
          <Cone id="uc-cone-lg" className="w-20" />
        </div>

        {/* Barricade strip closing off the section */}
        <div
          aria-hidden
          className="absolute bottom-0 h-3 w-full"
          style={HAZARD_STRIPES}
        />
      </section>

      <style>{`
        @keyframes uc-tape { to { transform: translateX(-50%); } }
        @keyframes uc-stripes { to { background-position: 1.25rem 0; } }
        .uc-marquee { animation: uc-tape 24s linear infinite; }
        .uc-progress-fill { animation: uc-stripes 1.1s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .uc-marquee, .uc-progress-fill { animation: none; }
        }
      `}</style>
    </main>
  );
}

// Two crossed runs of barricade tape strung across the full bleed: a plain
// striped one behind, and a slowly scrolling printed one in front.
function CautionTapes() {
  return (
    <div
      aria-hidden
      className="pointer-events-none relative mb-12 w-full select-none md:mb-16"
    >
      <div
        className="absolute left-1/2 top-1/2 h-7 w-[110%] -translate-x-1/2 -translate-y-1/2 rotate-2 shadow-sm"
        style={HAZARD_STRIPES}
      />
      <div className="relative -mx-[5%] w-[110%] -rotate-2 overflow-hidden border-y-[3px] border-blue-900 bg-yellow-500 py-2 shadow-md">
        <div className="uc-marquee flex w-max">
          <TapeRun />
          <TapeRun />
        </div>
      </div>
    </div>
  );
}

function TapeRun() {
  return (
    <div className="flex w-max shrink-0 items-center">
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="flex items-center gap-5 whitespace-nowrap pr-5 text-sm font-bold uppercase tracking-[0.2em] text-blue-900"
        >
          Under construction
          <span className="block size-1.5 rotate-45 bg-blue-900" />
        </span>
      ))}
    </div>
  );
}

function SiteProgress() {
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="eyebrow flex items-baseline justify-between text-blue-600">
        <span>Site progress</span>
        <span>61% &mdash; and climbing</span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-pill border border-blue-100 bg-blue-50">
        <div
          className="uc-progress-fill h-full w-[61%]"
          style={PROGRESS_STRIPES}
        />
      </div>
    </div>
  );
}

function HardHatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Dome with a slot cut for the centre ridge, sitting on a wide brim */}
      <path d="M4.5 13.5v-1a7.5 7.5 0 0 1 6-7.35V10h3V5.15a7.5 7.5 0 0 1 6 7.35v1Z" />
      <rect x="2" y="14.5" width="20" height="3" rx="1.5" />
    </svg>
  );
}

function Cone({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 96 76" className={className} aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <path d="M43 6h10c1.5 0 2.8 1 3.2 2.5L70 62H26L39.8 8.5C40.2 7 41.5 6 43 6Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="96" height="76" fill="var(--color-red-600)" />
        <rect y="26" width="96" height="9" fill="var(--color-white)" />
        <rect y="44" width="96" height="9" fill="var(--color-white)" />
      </g>
      <rect x="12" y="62" width="72" height="9" rx="3" fill="var(--color-blue-900)" />
    </svg>
  );
}
