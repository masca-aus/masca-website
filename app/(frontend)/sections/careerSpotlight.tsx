import Link from "next/link"

import Button from "@/components/Button"
import CompanyMark from "@/app/(frontend)/careers/CompanyMark"
import { ClosingChip, WorkingRightsBadge } from "@/app/(frontend)/careers/JobBadges"
import type { Job } from "@/utils/careers"
import { loadCareerBoard } from "@/utils/careersSource"

// Home-page spotlight for the /careers board: the message on the left, a
// live peek at the board on the right. Uses loadCareerBoard (never throws)
// so a sheet hiccup shrinks this to a plain pitch instead of taking the
// home page down. Rows deep-link into the board via ?job=.

const PREVIEW_COUNT = 3

const PROMISES = [
  {
    heading: "Working rights, spelled out",
    body: "Every role says up front whether international students can apply.",
  },
  {
    heading: "Closing dates, up front",
    body: "See what closes this week before you spend an evening on a cover letter.",
  },
  {
    heading: "Curated, not scraped",
    body: "Hand-picked by the MASCA Careers team — internships, grad programs and part-time gigs.",
  },
]

export default async function CareerSpotlightSection() {
  const board = await loadCareerBoard()
  const jobs = board.status === "ok" ? board.jobs : []
  const preview = jobs.slice(0, PREVIEW_COUNT)

  return (
    <section className="bg-blue-600">
      <div className="container section-pad grid grid-cols-1 items-center gap-16 lg:grid-cols-2">

        {/* Left: the pitch */}
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-4">
            <span className="eyebrow text-yellow-500">the jobs board</span>
            <h2 className="title text-white">
              Find your next opportunity
            </h2>
          </header>

          <p className="text-gray-300">
            One board for Malaysian students in Australia: internships, graduate programs,
            part-time work and roles back home — refreshed through the semester.
          </p>

          <ul className="grid grid-cols-1 gap-6 border-t border-white/15 pt-8 sm:grid-cols-3">
            {PROMISES.map((item) => (
              <li key={item.heading} className="flex flex-col gap-1.5">
                <span className="eyebrow text-yellow-500">{item.heading}</span>
                <p className="text-body-sm text-gray-300">{item.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex flex-wrap gap-4">
            <Button href="/careers" variant="accent">
              Browse the board <span aria-hidden>&rarr;</span>
            </Button>
            <Button href="/contact" variant="outlineLight">
              Post a role
            </Button>
          </div>
        </div>

        {/* Right: a peek at the board */}
        <div className="flex justify-center lg:justify-end">
          <BoardPeek jobs={preview} total={jobs.length} />
        </div>

      </div>
    </section>
  )
}

function BoardPeek({ jobs, total }: { jobs: Job[]; total: number }) {
  return (
    <div className="flex w-full max-w-xl flex-col gap-4 rounded-xl bg-white p-5 shadow-brand md:p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2.5 eyebrow text-gray-700">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-pill bg-red-600 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-pill bg-red-600" />
          </span>
          {total > 0 ? `${total} ${total === 1 ? "role" : "roles"} live` : "on the board"}
        </span>
        <Link
          href="/careers"
          className="text-caption font-bold text-blue-600 hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          See all <span aria-hidden>&rarr;</span>
        </Link>
      </div>

      {jobs.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/careers?job=${encodeURIComponent(job.id)}`}
                className="flex gap-3 rounded-2xl border-2 border-transparent bg-white p-4 shadow-md transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-blue-600 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <CompanyMark name={job.company} logoUrl={job.logoUrl} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <span className="line-clamp-2 min-w-0 flex-1 basis-40 text-body font-bold leading-tight text-blue-600">
                      {job.title}
                    </span>
                    <ClosingChip job={job} />
                  </div>
                  <p className="truncate text-body-sm text-gray-700">
                    {job.company}
                    {job.location && <span className="text-gray-700/80"> · {job.location}</span>}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <WorkingRightsBadge value={job.international} compact />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="-rotate-2 font-accent text-3xl leading-tight text-red-600">
            new roles land here every week
          </span>
          <p className="max-w-xs text-body-sm text-gray-700">
            The Careers team is pinning up the next batch. Check the board, or tell us
            about a role you&apos;d like to see.
          </p>
        </div>
      )}
    </div>
  )
}
