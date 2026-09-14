// The board's state store is the URL query string. Reading it through
// useSyncExternalStore (with an empty server snapshot) means the prerendered
// page shows the default view, the first client render matches it exactly,
// and a deep link or shared filter set applies right after hydration without
// any effect-driven setState. Writes go through the History API — Next
// patches pushState/replaceState, so its router stays in sync — and notify
// subscribers by hand, since those calls fire no event. popstate (hardware
// Back) is forwarded too, which is how the mobile sheet closes on Back.

const listeners = new Set<() => void>()

export function subscribeToQuery(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener("popstate", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("popstate", listener)
  }
}

export function readQuery(): string {
  return window.location.search
}

export function serverQuery(): string {
  return ""
}

function nextUrl(query: string): string | null {
  const next = `${window.location.pathname}${query ? `?${query}` : ""}`
  return next === `${window.location.pathname}${window.location.search}` ? null : next
}

/** Replaces the query string in place (no history entry) and notifies the board. */
export function writeQuery(query: string): void {
  const next = nextUrl(query)
  if (next === null) return
  window.history.replaceState(null, "", next)
  listeners.forEach((listener) => listener())
}

/** Adds a history entry, so Back returns to the previous view (the phone sheet). */
export function pushQuery(query: string): boolean {
  const next = nextUrl(query)
  if (next === null) return false
  window.history.pushState(null, "", next)
  listeners.forEach((listener) => listener())
  return true
}
