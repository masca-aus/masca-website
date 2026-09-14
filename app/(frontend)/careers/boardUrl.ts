// The board's state store is the URL query string. Reading it through
// useSyncExternalStore (with an empty server snapshot) means the prerendered
// page shows the default view, the first client render matches it exactly,
// and a deep link or shared filter set applies right after hydration without
// any effect-driven setState. Writes go through the History API — Next
// patches pushState/replaceState, so its router stays in sync — and notify
// subscribers by hand, since those calls fire no event. popstate (hardware
// Back) is forwarded too, which is how the mobile sheet closes on Back.
//
// Safari throws once a page calls the History API ~100 times in 30 s (easy
// to hit by holding an arrow key), so the store keeps its own copy of the
// query: the board updates instantly from that copy, and the address bar
// catches up on a short retry when the browser is willing.

const listeners = new Set<() => void>()
let current: string | null = null
let retry: ReturnType<typeof setTimeout> | null = null

const notify = () => listeners.forEach((listener) => listener())

function onPopState() {
  current = window.location.search
  notify()
}

export function subscribeToQuery(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener("popstate", onPopState)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("popstate", onPopState)
  }
}

export function readQuery(): string {
  return current ?? window.location.search
}

export function serverQuery(): string {
  return ""
}

function urlFor(query: string): string {
  return `${window.location.pathname}${query ? `?${query}` : ""}`
}

function commit(mode: "replaceState" | "pushState", query: string): boolean {
  if (retry) {
    clearTimeout(retry)
    retry = null
  }
  try {
    window.history[mode](null, "", urlFor(query))
    return true
  } catch {
    // Throttled: keep the in-memory state and try the address bar again shortly.
    retry = setTimeout(() => {
      retry = null
      if (current !== null && current !== window.location.search) commit("replaceState", current.replace(/^\?/, ""))
    }, 500)
    return false
  }
}

/** Replaces the query string in place (no history entry) and notifies the board. */
export function writeQuery(query: string): void {
  const search = query ? `?${query}` : ""
  if (search === readQuery()) return
  current = search
  commit("replaceState", query)
  notify()
}

/** Adds a history entry, so Back returns to the previous view (the phone sheet). */
export function pushQuery(query: string): boolean {
  const search = query ? `?${query}` : ""
  if (search === readQuery()) return false
  current = search
  const pushed = commit("pushState", query)
  notify()
  return pushed
}
