'use client'

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode, type RefObject } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"
import { X } from "lucide-react"

// The board's sheet — the MemberModal recipe from the committee page (overlay,
// GSAP in/out, Escape, scroll lock) plus a focus trap and focus return, which
// a sheet a student reads for a while needs. Slides up from the bottom on
// phones and sits centred on wider screens. Render it at the section level,
// after the site header in DOM order, so its z-50 overlay paints over the
// header's.

const FOCUSABLE =
  'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'

const RequestCloseContext = createContext<() => void>(() => {})

/** The animated close, for a Done button rendered inside the sheet. */
export function useRequestClose(): () => void {
  return useContext(RequestCloseContext)
}

/** The sheet's dismiss control, rendered inline beside the sheet's title. */
export function CloseButton({ className = "" }: { className?: string }) {
  const requestClose = useRequestClose()
  return (
    <button
      type="button"
      onClick={requestClose}
      aria-label="Close"
      className={`-mr-2 -mt-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-gray-700 transition-colors hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${className}`}
    >
      <X className="size-6" strokeWidth={2.5} aria-hidden />
    </button>
  )
}

export default function ModalShell({
  labelledBy,
  onClose,
  returnFocusRef,
  size = "md",
  footer,
  children,
}: {
  /** id of the heading inside the sheet. */
  labelledBy: string
  /** Called once the close animation has finished — unmount the sheet here. */
  onClose: () => void
  /** The control that opened the sheet, to hand focus back on close. */
  returnFocusRef: RefObject<HTMLElement | null>
  size?: "md" | "lg"
  /** Pinned below the scrolling body. A real sibling, not a sticky overlay. */
  footer?: ReactNode
  children: ReactNode
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  // Fade with `opacity`, not `autoAlpha`: autoAlpha starts at
  // visibility:hidden, which makes the initial focus() below a no-op.
  useGSAP(() => {
    tl.current = gsap.timeline()
      .from(overlayRef.current, { opacity: 0, duration: 0.25, ease: "none" })
      .from(boxRef.current, { opacity: 0, y: 32, duration: 0.4, ease: "entranceEase" }, 0.05)
  }, { scope: overlayRef })

  const requestClose = useCallback(() => {
    const t = tl.current
    if (!t) return onClose()
    t.eventCallback("onReverseComplete", onClose)
    t.timeScale(1.5).reverse()
  }, [onClose])

  // Mount: take focus and lock the page. Unmount: hand focus back to the
  // opener, read now since the ref may point elsewhere by then. Focus lands on
  // the panel itself, so a screen reader starts at the top of the sheet rather
  // than on the dismiss control.
  useEffect(() => {
    const returnTo = returnFocusRef.current
    boxRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
      returnTo?.focus()
    }
  }, [returnFocusRef])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        requestClose()
        return
      }
      if (e.key !== "Tab" || !boxRef.current) return
      // Keep Tab / Shift+Tab inside the sheet.
      const focusable = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [requestClose])

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose()
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-blue-950/60 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        ref={boxRef}
        tabIndex={-1}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-brand focus:outline-none sm:rounded-2xl ${
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-xl"
        }`}
      >
        <RequestCloseContext value={requestClose}>
          {/* min-h-0 lets the body shrink inside the column so it, not the
              sheet, is what scrolls. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8">{children}</div>
          {footer && (
            <div className="shrink-0 border-t border-gray-300 bg-white px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-4">
              {footer}
            </div>
          )}
        </RequestCloseContext>
      </div>
    </div>
  )
}