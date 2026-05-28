import Link from "next/link"

import InlineCheckout from "@/app/events/InlineCheckout"
import { getEventById } from "@/utils/events"

/** "2026-06-12T18:00:00" → "Fri, 12 Jun 2026, 6:00 pm" (event-local wall clock). */
function formatWhen(local: string) {
  return new Date(local).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const event = await getEventById(eventId)

  return (
    <main style={{ paddingTop: 120 }} className="container py-16">
      <Link href="/events" className="text-body-sm font-bold text-blue-600 hover:underline">
        <span aria-hidden>&larr;</span> Back to events
      </Link>

      <header className="mt-6 mb-10 flex flex-col gap-3">
        <h1 className="title text-blue-600">{event?.name.text ?? "Checkout"}</h1>
        {event && (
          <p className="text-gray-700">
            {formatWhen(event.start.local)}
            {event.venue ? ` · ${event.venue.name}` : ""}
          </p>
        )}
        {event?.summary && (
          <p className="mt-2 max-w-2xl text-body text-gray-700">{event.summary}</p>
        )}
      </header>

      <InlineCheckout eventId={eventId} />
    </main>
  )
}