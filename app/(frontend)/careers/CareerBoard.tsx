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
  getIndustryFacets,
  getLocationFacets,
  getStudyLevelFacets,
  getTypeFacets,
  parseBoardUrl,
  serialiseBoardUrl,
  type CareerFilters,
} from "@/utils/careerFilters"
import type { Job } from "@/utils/careers"
import BoardEmpty from "./BoardEmpty"
import BoardToolbar from "./BoardToolbar"
import JobCard from "./JobCard"
import JobDetails from "./JobDetails"
import JobModal from "./JobModal"
import { pushQuery, readQuery, serverQuery, subscribeToQuery, writeQuery } from "./boardUrl"

// The interactive board. It receives every live role from the server and
// filters client-side (a sheet is a few hundred rows at most).
//
// Filters and the selected role live in the query string
// (`?type=internship&loc=vic&job=acme-dev`) so a view can be shared or
// reloaded — see boardUrl.ts for why that is the store rather than
// useSearchParams (which would force the list behind a Suspense fallback)
// or page-level searchParams (which would make the page dynamic).
//
// Nothing here calls Date: every relative label arrives precomputed in the
// job props, so server and client render the same markup.

const PAGE_SIZE = 24
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
  const urlFilters = useMemo<CareerFilters>(() => {
    const { job, ...filters } = urlState
    void job
    return filters
  }, [urlState])

  // The search box keeps its own value while typing; the URL catches up on a
  // debounce (Safari throttles history writes). null = follow the URL.
  const [typed, setTyped] = useState<string | null>(null)
  const searchValue = typed ?? urlFilters.q
  const deferredSearch = useDeferredValue(searchValue)
  const [limit, setLimit] = useState(PAGE_SIZE)

  const listRef = useRef<HTMLUListElement>(null)
  const detailRef = useRef<HTMLElement>(null)
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
      locations: getLocationFacets(jobs),
      levels: getStudyLevelFacets(jobs),
      industries: getIndustryFacets(jobs),
    }),
    [jobs],
  )

  // A linked role stays selected even when the filters would hide it.
  const linkedJob = linkedId ? jobById.get(linkedId) : undefined
  const linkedMissing = linkedId !== null && !linkedJob
  const selectedJob = linkedJob ?? visible[0] ?? null
  const outsideFilters = selectedJob !== null && !visible.some((j) => j.id === selectedJob.id)
  const focusId = outsideFilters || !selectedJob ? visible[0]?.id : selectedJob.id
  const shown = visible.slice(0, limit)
  // The sheet only exists below lg; on desktop the sticky panel shows it.
  const modalOpen = !isDesktop && linkedJob !== undefined

  // --- writes -------------------------------------------------------------
  const write = useCallback(
    (filters: CareerFilters, jobId: string | null) => writeQuery(serialiseBoardUrl({ ...filters, job: jobId })),
    [],
  )

  const updateFilters = useCallback(
    (patch: Partial<CareerFilters>) => {
      write({ ...urlFilters, ...patch, q: searchValue.trim() }, linkedId)
      setLimit(PAGE_SIZE)
    },
    [write, urlFilters, searchValue, linkedId],
  )

  const clearFilters = useCallback(() => {
    setTyped(null)
    write(EMPTY_FILTERS, linkedId)
    setLimit(PAGE_SIZE)
  }, [write, linkedId])

  // Debounced: the URL follows the search box a beat behind the keystrokes.
  useEffect(() => {
    if (typed === null) return
    const timer = setTimeout(() => write({ ...urlFilters, q: typed.trim() }, linkedId), 250)
    return () => clearTimeout(timer)
  }, [typed, urlFilters, linkedId, write])

  const select = useCallback(
    (job: Job, viaKeyboard: boolean, element: HTMLElement) => {
      returnFocusRef.current = element
      const filters = { ...urlFilters, q: searchValue.trim() }
      if (readIsDesktop()) {
        write(filters, job.id)
        // Enter on a card lands keyboard users on the panel; mouse clicks don't move focus.
        if (viaKeyboard) detailRef.current?.focus()
      } else {
        // The sheet gets its own history entry so hardware Back closes it.
        pushedSheetRef.current = pushQuery(serialiseBoardUrl({ ...filters, job: job.id }))
      }
    },
    [write, urlFilters, searchValue],
  )

  // Closing the sheet drops the role from the URL, so a refresh on the phone
  // reopens the list rather than the sheet.
  const closeModal = useCallback(() => {
    if (pushedSheetRef.current) {
      pushedSheetRef.current = false
      window.history.back()
    } else {
      write({ ...urlFilters, q: searchValue.trim() }, null)
    }
  }, [write, urlFilters, searchValue])

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
    if (id && readIsDesktop()) write({ ...urlFilters, q: searchValue.trim() }, id)
  }

  // --- entrance animation -----------------------------------------------
  // First run: the events-page stagger on scroll. Later runs (a filter
  // changed the list): a short fade with an explicit end state, so an
  // interrupted tween can never leave cards stuck invisible.
  const listKey = shown.map((j) => j.id).join("|")
  const firstRun = useRef(true)
  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(".job-card", listRef.current)
      if (cards.length === 0) return
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      if (firstRun.current) {
        firstRun.current = false
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
      gsap.fromTo(
        cards,
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
          onSearchChange={(value) => {
            setTyped(value)
            setLimit(PAGE_SIZE)
          }}
          onChange={updateFilters}
          onClear={clearFilters}
          facets={facets}
          total={jobs.length}
          visible={visible.length}
        />

        {linkedMissing && (
          <p role="status" className="rounded-lg border border-yellow-100 bg-yellow-50 p-4 text-body-sm text-yellow-800">
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
              <ul
                ref={listRef}
                role="list"
                aria-label="Open roles"
                onKeyDown={onListKeyDown}
                className="flex flex-col gap-3"
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
              {visible.length > shown.length && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                  className="self-center"
                >
                  Show more roles ({visible.length - shown.length} left)
                </Button>
              )}
            </div>

            <aside
              ref={detailRef}
              id="job-detail"
              tabIndex={-1}
              aria-labelledby="job-detail-title"
              className="hidden rounded-2xl bg-white p-8 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 lg:sticky lg:top-28 lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
            >
              {selectedJob && (
                <JobDetails job={selectedJob} headingId="job-detail-title" outsideFilters={outsideFilters} />
              )}
            </aside>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {selectedJob ? `Showing ${selectedJob.title} at ${selectedJob.company}` : ""}
      </p>

      {modalOpen && linkedJob && (
        <div className="lg:hidden">
          <JobModal job={linkedJob} onClose={closeModal} returnFocusRef={returnFocusRef} />
        </div>
      )}
    </section>
  )
}
