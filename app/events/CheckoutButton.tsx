'use client'

import { useEffect } from "react"

import Button from "@/components/Button"

const EB_WIDGET_SRC = "https://www.eventbrite.com/static/widgets/eb_widgets.js"

declare global {
  interface Window {
    EBWidgets?: {
      createWidget: (options: {
        widgetType: "checkout"
        eventId: string
        modalTriggerElementId?: string
        iframeContainerId?: string
        iframeContainerHeight?: number
        onOrderComplete?: () => void
        promoCode?: string
        themeSettings?: {
          brandColor?: string
          fontColor?: string
          background?: string
        }
      }) => void
    }
  }
}

// Load eb_widgets.js exactly once, shared across every card on the page.
let widgetReady: Promise<void> | null = null
function loadEbWidgets(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.EBWidgets) return Promise.resolve()
  if (!widgetReady) {
    widgetReady = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script")
      s.src = EB_WIDGET_SRC
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error("Failed to load Eventbrite widgets"))
      document.body.appendChild(s)
    })
  }
  return widgetReady
}

/**
 * Opens Eventbrite's hosted checkout in a modal overlay, keyed by the numeric
 * event id. No token needed — embedded checkout is public. The event must have
 * embedded checkout enabled in Eventbrite or the modal won't open.
 */
export default function CheckoutButton({
  eventId,
  label = "Register",
}: {
  eventId: string
  label?: string
}) {
  const triggerId = `eb-checkout-trigger-${eventId}`

  useEffect(() => {
    let cancelled = false
    loadEbWidgets()
      .then(() => {
        // Runs after the DOM commit, so the trigger button is guaranteed to
        // exist — the getElementById guard is what keeps Eventbrite in modal
        // mode instead of falling back to inline.
        if (cancelled || !window.EBWidgets || !document.getElementById(triggerId)) return
        window.EBWidgets.createWidget({
          widgetType: "checkout",
          eventId,
          modalTriggerElementId: triggerId,
          // Brand the checkout to match the site (modal mode, not inline).
          themeSettings: {
            brandColor: "#010066", // --color-blue-600
            fontColor: "#000000", // --color-black
            background: "#ffffff", // --color-white
          },
        })
      })
      .catch(() => {
        /* network/embed failure — the button just won't open a modal */
      })
    return () => {
      cancelled = true
    }
  }, [eventId, triggerId])

  return (
    <Button id={triggerId} type="button" variant="ghost">
      {label} <span aria-hidden>&rarr;</span>
    </Button>
  )
}