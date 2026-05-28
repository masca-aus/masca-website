'use client'

import { useEffect } from "react"

const EB_WIDGET_SRC = "https://www.eventbrite.com/static/widgets/eb_widgets.js"

declare global {
  interface Window {
    EBWidgets?: {
      createWidget: (options: {
        widgetType: "checkout"
        eventId: string
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

// Load eb_widgets.js exactly once per page.
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
 * Embeds Eventbrite's inline checkout for a single event. No token needed —
 * embedded checkout is public and keyed only by the numeric event id.
 */
export default function InlineCheckout({ eventId }: { eventId: string }) {
  const containerId = `eb-checkout-container-${eventId}`

  useEffect(() => {
    let cancelled = false
    loadEbWidgets()
      .then(() => {
        const container = document.getElementById(containerId)
        if (cancelled || !window.EBWidgets || !container) return
        container.innerHTML = "" // reset on re-run so iframes don't stack
        window.EBWidgets.createWidget({
          widgetType: "checkout",
          eventId,
          iframeContainerId: containerId,
          iframeContainerHeight: 700,
          themeSettings: {
            brandColor: "#010066", // --color-blue-600
            fontColor: "#000000", // --color-black
            background: "#ffffff", // --color-white
          },
        })
      })
      .catch(() => {
        /* network/embed failure — container stays empty */
      })
    return () => {
      cancelled = true
    }
  }, [eventId, containerId])

  return <div id={containerId} className="w-full" />
}