'use client'

import { startTransition, useEffect } from "react"
import { useRouter } from "next/navigation"

import Button from "@/components/Button"

// CMS read failures preserve the cached page during background revalidation.
// This boundary handles an uncached request; the cause stays in server logs.

export default function CareersError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error(error)
  }, [error])

  // reset() alone only re-renders the boundary; the server component has to
  // be fetched again for a retry to mean anything.
  const retry = () =>
    startTransition(() => {
      router.refresh()
      reset()
    })

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
            <Button variant="accent" type="button" onClick={retry}>
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
