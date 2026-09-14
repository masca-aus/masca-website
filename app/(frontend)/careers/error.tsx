'use client'

import { useEffect } from "react"

import Button from "@/components/Button"

// Route error boundary: reached only when the sheet can't be read and there
// is no previously generated page to fall back on (a first deploy, or a
// cold cache). The message stays in MASCA's voice; the cause is in the logs.

export default function CareersError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main id="main">
      <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-32 min-h-80">
        <div className="container flex flex-col gap-6">
          <span className="eyebrow text-yellow-500">masca careers</span>
          <h1 className="max-w-3xl text-white text-4xl md:text-5xl lg:text-6xl">
            The board took a{" "}
            <span className="font-accent font-normal text-yellow-500">teh tarik break</span>
          </h1>
          <p className="max-w-xl text-blue-100/80 md:text-lg">
            We couldn&apos;t reach the listings just now. Give it a minute and try again — the
            roles aren&apos;t going anywhere.
          </p>
          <div className="mt-2 flex flex-wrap gap-4">
            <Button variant="accent" type="button" onClick={reset}>
              Try again
            </Button>
            <Button href="/" variant="outlineLight">
              Back to home
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
