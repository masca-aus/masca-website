import Button from "@/components/Button";

// Full-height placeholder band for routes that aren't built yet. Light-section
// palette: white ground, red eyebrow, blue heading with the brush script
// picking out the key phrase in red.
export default function UnderConstruction() {
  return (
    <main id="main">
      <section className="flex flex-col justify-center bg-white py-48">
        <div className="container flex flex-col items-center gap-6 text-center">
          <span className="eyebrow text-red-600">pardon our dust</span>
          <h1 className="max-w-3xl text-blue-600 text-4xl md:text-5xl lg:text-6xl">
            This page is{" "}
            <span className="font-accent font-normal text-red-600">
              under construction
            </span>
          </h1>
          <p className="max-w-xl text-gray-600 md:text-lg">
            We&apos;re still putting this one together. Check back soon —
            we&apos;d love to show you what we&apos;re building.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            <Button href="/" variant="primary">
              Back to home <span aria-hidden>&rarr;</span>
            </Button>
            <Button href="/contact" variant="outline">
              Get in touch
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
