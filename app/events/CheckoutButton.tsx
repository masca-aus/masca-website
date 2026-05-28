import Button from "@/components/Button"

/**
 * Links to the dedicated checkout page for an event. The embedded Eventbrite
 * widget lives there (see app/events/[eventId]/checkout), which handles the
 * iframe height far better than a popup.
 */
export default function CheckoutButton({
  eventId,
  label = "Register",
}: {
  eventId: string
  label?: string
}) {
  return (
    <Button href={`/events/${eventId}/checkout`} variant="ghost">
      {label} <span aria-hidden>&rarr;</span>
    </Button>
  )
}