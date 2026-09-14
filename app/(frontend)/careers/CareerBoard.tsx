'use client'

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"

import Button from "@/components/Button"
import {
  EMPTY_FILTERS,
  applyFilters,
  countHiddenOnlyByIntl,
  getCityFacets,
  getCountryFacets,
  getIndustryFacets,
  getStateFacets,
  getStudyLevelFacets,
  getTypeFacets,
  getWorkModeFacets,
  pageCount,
  pageOf,
  pageSlice,
  parseBoardUrl,
  serialiseBoardUrl,
  type BoardUrlState,
  type CareerFilters,
  type PageSize,
} from "@/utils/careerFilters"
import type { Job } from "@/utils/careers"
import BoardEmpty from "./BoardEmpty"
import BoardPagination from "./BoardPagination"
import BoardToolbar from "./BoardToolbar"
import FilterModal from "./FilterModal"
import JobCard from "./JobCard"
import JobDetails from "./JobDetails"
import JobModal from "./JobModal"
import { pushQuery, readQuery, serverQuery, subscribeToQuery, writeQuery } from "./boardUrl"

// The interactive board. It receives every live role from the server and
// filters client-side (a sheet is a few hundred rows at most).
//
// Filters, the selected role, the page and the page size live in the query
// string (`?type=internship&loc=vic&page=2&job=acme-dev`) so a view can be
// shared or reloaded — see boardUrl.ts for why that is the store rather than
// useSearchParams (which would force the list behind a Suspense fallback)
// or page-level searchParams (which would make the page dynamic).
//
// On desktop the details panel is pinned beside the list and scrolls on its
// own; the toolbar and the list scroll with the page. Below lg a tapped card
// opens a sheet instead of the panel.
//
// Nothing here calls Date: every relative label arrives precomputed in the
// job props, so server and client render the same markup.

const DESKTOP_QUERY = "(min-width: 1024px)"

function subscribeToViewport(listener: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY)
  mq.addEventListener("change", listener)
  return () => mq.removeEventListener("change", listener)
}
const readIsDesktop = () => window.matchMedia(DESKTOP_QUERY).matches
const serverIsDesktop = () => false

export default function CareerBoard({ jobs }: { jobs: Job[] }) {
  // --- URL-backed state ---------------------------------------------------
  const query = useSyncExternalStore(subscribeToQuery, readQuery, serverQuery)
  const isDesktop = useSyncExternalStore(subscribeToViewport, readIsDesktop, serverIsDesktop)
  const urlState = useMemo(() => parseBoardUrl(new URLSearchParams(query)), [query])
  const linkedId = urlState.job
  const per = urlState.per
  const urlFilters = useMemo<CareerFilters>(() => {
    const { job, page, per, ...filters } = urlState
    void job
    void page
    void per
    return filters
  }, [urlState])

  // The search box keeps its own value while typing; the URL catches up on a
  // debounce (Safari throttles history writes). null = follow the URL.
  const [typed, setTyped] = useState<string | null>(null)
  const searchValue = typed ?? urlFilters.q
  const deferredSearch = useDeferredValue(searchValue)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const listRef = useRef<HTMLUListElement>(null)
  const detailRef = useRef<HTMLElement>(null)
  const filtersButtonRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  // True while the phone sheet sits on a history entry we pushed, so its
  // Close button can pop that entry and hardware Back does the same thing.
  const pushedSheetRef = useRef(false)

  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs])
  const effectiveFilters = useMemo(
    () => ({ ...urlFilters, q: deferredSearch.trim() }),
    [urlFilters, deferredSearch],
  )
  const visible = useMemo(() => applyFilters(jobs, effectiveFilters), [jobs, effectiveFilters])
  const facets = useMemo(
    () => ({
      types: getTypeFacets(jobs),
      countries: getCountryFacets(jobs),
      states: getStateFacets(jobs),
      cities: getCityFacets(jobs),
      modes: getWorkModeFacets(jobs),
      levels: getStudyLevelFacets(jobs),
      industries: getIndustryFacets(jobs),
    }),
    [jobs],
  )

  // A linked role stays selected even when the filters would hide it.
  const linkedJob = linkedId ? jobById.get(linkedId) : undefined
  const linkedMissing = linkedId !== null && !linkedJob

  // --- pagination ---------------------------------------------------------
  // While the search box is ahead of the URL the list shows its first page;
  // the debounced write below makes that official. A shared `?job=` link
  // names no page, so it opens on the page that holds the role.
  const pages = pageCount(visible.length, per)
  const searching = effectiveFilters.q !== urlFilters.q
  const requested = searching
    ? 1
    : (urlState.page ?? (linkedJob ? pageOf(visible.findIndex((j) => j.id === linkedJob.id), per) : 1))
  const page = Math.min(Math.max(1, requested), pages)
  const shown = pageSlice(visible, page, per)
  const firstIndex = (page - 1) * per

  const selectedJob = linkedJob ?? shown[0] ?? null
  const outsideFilters = selectedJob !== null && !visible.some((j) => j.id === selectedJob.id)
  // Roving tabindex: exactly one rendered card is in the tab order.
  const focusId = shown.some((j) => j.id === selectedJob?.id) ? selectedJob?.id : shown[0]?.id
  // The sheet only exists below lg; on desktop the sticky panel shows it.
  const modalOpen = !isDesktop && linkedJob !== undefined

  // --- writes -------------------------------------------------------------
  // Handlers read the latest state from here, so memoised cards don't
  // re-render on every keystroke just because a callback identity changed.
  const latest = useRef({ urlState, searchValue, page })
  useEffect(() => {
    latest.current = { urlState, searchValue, page }
  })

  /** Writes the URL: the current state, the live search text, then `patch`. */
  const commit = useCallback(
    (patch: Partial<BoardUrlState>, mode: "replace" | "push" = "replace"): boolean => {
      const { urlState, searchValue, page } = latest.current
      const next = serialiseBoardUrl({ ...urlState, q: searchValue.trim(), page, ...patch })
      if (mode === "push") return pushQuery(next)
      writeQuery(next)
      return true
    },
    [],
  )

  // Any filter change restarts at page 1; the selected role rides along.
  const updateFilters = useCallback(
    (patch: Partial<CareerFilters>) => {
      commit({ ...patch, page: 1 })
    },
    [commit],
  )

  const clearFilters = useCallback(() => {
    setTyped(null)
    commit({ ...EMPTY_FILTERS, page: 1 })
  }, [commit])

  const openFilters = useCallback(() => setFiltersOpen(true), [])
  const closeFilters = useCallback(() => setFiltersOpen(false), [])

  // Debounced: the URL follows the search box a beat behind the keystrokes.
  useEffect(() => {
    if (typed === null) return
    const timer = setTimeout(() => commit({ q: typed.trim(), page: 1 }), 250)
    return () => clearTimeout(timer)
  }, [typed, commit])

  const select = useCallback(
    (job: Job, viaKeyboard: boolean, element: HTMLElement) => {
      returnFocusRef.current = element
      if (readIsDesktop()) {
        commit({ job: job.id })
        // Enter on a card lands keyboard users on the panel; mouse clicks don't move focus.
        if (viaKeyboard) detailRef.current?.focus()
      } else {
        // The sheet gets its own history entry so hardware Back closes it.
        pushedSheetRef.current = commit({ job: job.id }, "push")
      }
    },
    [commit],
  )

  // Closing the sheet drops the role from the URL, so a refresh on the phone
  // reopens the list rather than the sheet.
  const closeModal = useCallback(() => {
    if (pushedSheetRef.current) {
      pushedSheetRef.current = false
      window.history.back()
    } else {
      commit({ job: null })
    }
  }, [commit])

  // A new page shows its first role in the panel. The list scrolls back to
  // its top (under the fixed header — see its scroll-mt classes) when the
  // pager was reached by scrolling past that top.
  const goToPage = useCallback(
    (next: number) => {
      commit({ page: next, job: null })
      const list = listRef.current
      if (!list) return
      const margin = parseFloat(getComputedStyle(list).scrollMarginTop) || 0
      if (list.getBoundingClientRect().top < margin) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        list.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" })
      }
    },
    [commit],
  )

  // Resizing the page keeps the selected card (else the first one) in view.
  const changePageSize = (next: PageSize) => {
    const anchor =
      selectedJob && shown.some((j) => j.id === selectedJob.id)
        ? visible.findIndex((j) => j.id === selectedJob.id)
        : firstIndex
    commit({ per: next, page: pageOf(anchor, next) })
  }

  // Arrow keys move through the list; on desktop they also change the panel.
  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-job-id]") ?? [])
    if (buttons.length === 0) return
    const index = buttons.findIndex((b) => b === document.activeElement)
    let next = index
    if (event.key === "ArrowDown") next = Math.min(buttons.length - 1, index + 1)
    if (event.key === "ArrowUp") next = Math.max(0, index - 1)
    if (event.key === "Home") next = 0
    if (event.key === "End") next = buttons.length - 1
    if (next === -1) next = 0
    if (next === index) return
    event.preventDefault()
    const target = buttons[next]
    target.focus()
    const id = target.dataset.jobId
    if (id && readIsDesktop()) commit({ job: id })
  }

  // --- entrance animation -----------------------------------------------
  // First paint: the events-page stagger on scroll (skipped for deep links,
  // whose first paint is replaced a moment later by the filtered view).
  // Later: only cards that weren't on screen before fade in, so typing that
  // narrows the list never re-animates what's already there — while a new
  // page, all fresh cards, gets the full stagger.
  const shownIds = shown.map((j) => j.id)
  const listKey = shownIds.join("|")
  const prevIdsRef = useRef<Set<string> | null>(null)
  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(".job-card", listRef.current)
      const previous = prevIdsRef.current
      prevIdsRef.current = new Set(shownIds)
      if (cards.length === 0) return
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      if (previous === null) {
        if (window.location.search) return
        gsap.from(cards, {
          opacity: 0,
          y: 32,
          scale: 0.96,
          duration: 0.55,
          stagger: 0.06,
          ease: "entranceEase",
          clearProps: "transform",
          scrollTrigger: { trigger: listRef.current, start: "top 85%" },
        })
        return
      }
      const fresh = cards.filter((card) => !previous.has(card.dataset.jobId ?? ""))
      if (fresh.length === 0) return
      gsap.fromTo(
        fresh,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, stagger: { each: 0.03 }, ease: "entranceEase", overwrite: true, clearProps: "transform" },
      )
    },
    { scope: listRef, dependencies: [listKey], revertOnUpdate: true },
  )

  // --- empty state inside the board --------------------------------------
  const unsureCount = visible.length === 0 ? countHiddenOnlyByIntl(jobs, effectiveFilters) : 0

  return (
    <section className="bg-gray-100">
      <div className="container flex flex-col gap-8 py-16">
        <BoardToolbar
          filters={urlFilters}
          searchValue={searchValue}
          onSearchChange={setTyped}
          onChange={updateFilters}
          onClear={clearFilters}
          facets={facets}
          total={jobs.length}
          visible={visible.length}
          per={per}
          onPerChange={changePageSize}
          filtersOpen={filtersOpen}
          onOpenFilters={openFilters}
          filtersButtonRef={filtersButtonRef}
        />

        {linkedMissing && (
          <p role="status" className="rounded-lg border border-yellow-100 bg-yellow-50 p-4 text-body-sm text-blue-900">
            That role&apos;s closed or been taken down. Here&apos;s what&apos;s still open.
          </p>
        )}

        {visible.length === 0 ? (
          unsureCount > 0 ? (
            <BoardEmpty
              compact
              variant="no-match-intl"
              detail={unsureCount}
              actions={
                <>
                  <Button variant="primary" type="button" onClick={() => updateFilters({ intl: "maybe" })}>
                    Show unconfirmed roles too
                  </Button>
                  <Button variant="ghost" type="button" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </>
              }
            />
          ) : effectiveFilters.q ? (
            <BoardEmpty
              compact
              variant="no-match-search"
              detail={effectiveFilters.q}
              actions={
                <Button variant="primary" type="button" onClick={() => setTyped("")}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <BoardEmpty
              compact
              variant="no-match"
              actions={
                <Button variant="primary" type="button" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          )
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
            <div className="flex flex-col gap-4">
              <h2 className="sr-only">Open roles</h2>
              <ul
                ref={listRef}
                id="job-list"
                role="list"
                aria-label="Open roles"
                onKeyDown={onListKeyDown}
                className="flex scroll-mt-20 flex-col gap-3 lg:scroll-mt-28"
              >
                {shown.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    selected={selectedJob?.id === job.id}
                    tabIndex={job.id === focusId ? 0 : -1}
                    onSelect={select}
                  />
                ))}
              </ul>
              {pages > 1 && (
                <BoardPagination
                  page={page}
                  count={pages}
                  from={firstIndex + 1}
                  to={firstIndex + shown.length}
                  total={visible.length}
                  onChange={goToPage}
                />
              )}
            </div>

            {/* Desktop panel: pinned under the fixed header, scrolling on its own. */}
            <aside
              ref={detailRef}
              id="job-detail"
              tabIndex={-1}
              aria-labelledby="job-detail-title"
              className="hidden rounded-2xl bg-white p-8 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 lg:sticky lg:top-28 lg:block lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:overscroll-contain"
            >
              {selectedJob && (
                <JobDetails job={selectedJob} headingId="job-detail-title" outsideFilters={outsideFilters} />
              )}
            </aside>
          </div>
        )}
      </div>

      {/* Desktop only: below lg the sheet's dialog title is the announcement. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isDesktop && selectedJob ? `Showing ${selectedJob.title} at ${selectedJob.company}` : ""}
      </p>

      {modalOpen && linkedJob && (
        <div className="lg:hidden">
          <JobModal job={linkedJob} onClose={closeModal} returnFocusRef={returnFocusRef} />
        </div>
      )}

      {filtersOpen && (
        <FilterModal
          filters={urlFilters}
          facets={facets}
          visible={visible.length}
          total={jobs.length}
          onChange={updateFilters}
          onClear={clearFilters}
          onClose={closeFilters}
          returnFocusRef={filtersButtonRef}
        />
      )}
    </section>
  )
}
