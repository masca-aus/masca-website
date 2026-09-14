'use client'

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import {
  Banknote,
  Briefcase,
  Building2,
  CalendarClock,
  Check,
  Clock,
  Earth,
  ExternalLink,
  GraduationCap,
  Link2,
  MapPin,
  Share2,
} from "lucide-react"

import Button from "@/components/Button"
import {
  JOB_TYPE_LABEL,
  STUDY_LEVEL_LABEL,
  formatClosesLabel,
  type Job,
} from "@/utils/careers"
import CompanyMark from "./CompanyMark"
import { FeaturedBadge, NewBadge, WorkModePill, WorkingRightsBadge } from "./JobBadges"

// Full listing, shared by the desktop panel and the mobile modal. Everything
// here is plain text from the sheet rendered through React (no HTML), and
// the only outbound links are the sanitised apply / website URLs.

/** Canonical share URL: filters stripped so the recipient lands on the role. */
export function jobShareUrl(origin: string, id: string): string {
  return `${origin}/careers?job=${encodeURIComponent(id)}`
}

export default function JobDetails({
  job,
  headingId,
  outsideFilters = false,
  showActions = true,
}: {
  job: Job
  headingId: string
  /** The role was reached by link and the current filters would hide it. */
  outsideFilters?: boolean
  /** Render the Apply bar inline. Off in the phone sheet, which puts
      JobActions in the shell's pinned footer instead. */
  showActions?: boolean
}) {
  const closes = formatClosesLabel(job)
  const levels = job.studyLevels.includes("any")
    ? "Any year level"
    : job.studyLevels.map((l) => STUDY_LEVEL_LABEL[l]).join(", ")

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 id={headingId} className="text-h2 font-bold leading-tight text-blue-600">
            {job.title}
          </h2>
          <p className="text-body text-gray-700">
            {job.companyWebsite ? (
              <a
                href={job.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-blue-600 underline-offset-2 hover:underline"
              >
                {job.company}
                <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <span className="font-bold">{job.company}</span>
            )}
            {job.industry && <span className="text-gray-700/80"> · {job.industry}</span>}
          </p>
          {(job.featured || job.isNew) && (
            <div className="flex flex-wrap items-center gap-2">
              {job.featured && <FeaturedBadge />}
              {job.isNew && <NewBadge />}
            </div>
          )}
        </div>
        <CompanyMark name={job.company} logoUrl={job.logoUrl} size="lg" />
      </header>

      {outsideFilters && (
        <p role="status" className="rounded-lg border border-yellow-100 bg-yellow-50 p-3 text-body-sm text-blue-900">
          Shown because you followed a link — it&apos;s outside your current filters.
        </p>
      )}

      <WorkingRightsCallout value={job.international} />

      <dl className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-3 text-body-sm text-gray-700">
        {/* City, State with the work mode; a country-only role shows just the Country row. */}
        {(job.location || job.workMode || !job.country) && (
          <MetaRow icon={<MapPin className="size-4" aria-hidden />} label="Location">
            {job.location || job.workMode ? (
              <span className="flex flex-wrap items-center gap-2">
                {job.location && <span>{job.location}</span>}
                {job.workMode && <WorkModePill mode={job.workMode} />}
              </span>
            ) : (
              "Location not listed"
            )}
          </MetaRow>
        )}

        {job.country && (
          <MetaRow icon={<Earth className="size-4" aria-hidden />} label="Country">
            {job.country.label}
          </MetaRow>
        )}

        <MetaRow icon={<CalendarClock className="size-4" aria-hidden />} label="Closing date">
          <span className={job.isClosingSoon ? "font-bold text-red-600" : undefined}>{closes}</span>
          {job.daysLeft !== undefined && job.daysLeft > 7 && (
            <span className="text-gray-700/80"> · {job.daysLeft} days left</span>
          )}
          {job.daysLeft === undefined && (
            <span className="text-gray-700/80"> — no closing date listed, so apply early.</span>
          )}
        </MetaRow>

        <MetaRow icon={<Briefcase className="size-4" aria-hidden />} label="Type">
          {JOB_TYPE_LABEL[job.type]}
        </MetaRow>

        <MetaRow icon={<GraduationCap className="size-4" aria-hidden />} label="Who can apply">
          {levels}
          {job.eligibility && <span className="block text-caption text-gray-700/80">{job.eligibility}</span>}
        </MetaRow>

        {job.pay && (
          <MetaRow icon={<Banknote className="size-4" aria-hidden />} label="Pay">
            {job.pay}
          </MetaRow>
        )}

        {job.industry && (
          <MetaRow icon={<Building2 className="size-4" aria-hidden />} label="Industry">
            {job.industry}
          </MetaRow>
        )}

        {job.addedLabel && (
          <MetaRow icon={<Clock className="size-4" aria-hidden />} label="Listed">
            {job.addedLabel}
          </MetaRow>
        )}
      </dl>

      {job.description ? (
        <Description text={job.description} />
      ) : (
        <p className="text-body-sm text-gray-700/80">No description yet — the apply link has the details.</p>
      )}

      {job.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {job.tags.map((tag) => (
            <li key={tag} className="rounded-pill bg-blue-50 px-2.5 py-0.5 text-caption font-bold text-blue-600">
              {tag}
            </li>
          ))}
        </ul>
      )}

      {showActions && <JobActions job={job} />}

      <p className="text-caption text-gray-700/80">
        Link dead or details wrong?{" "}
        <a href="/contact" className="font-bold text-blue-600 hover:underline">
          Tell the Careers team <span aria-hidden>&rarr;</span>
        </a>
      </p>
    </div>
  )
}

function MetaRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <>
      <dt className="flex items-center gap-2 pt-px text-gray-700/80">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}

/** The three answers to "can I even apply?", in MASCA's voice. */
function WorkingRightsCallout({ value }: { value: Job["international"] }) {
  if (value === "yes") {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-blue-100 bg-blue-50 p-4 text-body-sm text-blue-900">
        <WorkingRightsBadge value={value} />
        <p className="text-blue-900">
          The employer has confirmed this role accepts student-visa holders — go for it.
        </p>
      </div>
    )
  }
  if (value === "no") {
    return (
      <div className="flex flex-col gap-1 rounded-lg bg-gray-100 p-4 text-body-sm text-gray-700">
        <WorkingRightsBadge value={value} />
        <p className="text-gray-700">
          Sorry lah — this one isn&apos;t open to student visas. Flick it to a friend who&apos;s eligible.
        </p>
      </div>
    )
  }
  // Blue text on the yellow tint: yellow-800 on yellow-50 is only 2.9:1.
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-yellow-100 bg-yellow-50 p-4 text-body-sm text-blue-900">
      <WorkingRightsBadge value={value} />
      <p className="text-blue-900">
        The listing doesn&apos;t say. Email the recruiter before you sink time in, and ask about
        student-visa work conditions.
      </p>
    </div>
  )
}

type Block = { kind: "paragraph"; text: string } | { kind: "list"; items: string[] }

/** Blank lines separate paragraphs; lines starting with -, * or • form lists. */
export function descriptionBlocks(text: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join("\n") })
    paragraph = []
  }
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    if (bullet) {
      flush()
      const last = blocks[blocks.length - 1]
      if (last?.kind === "list") last.items.push(bullet[1])
      else blocks.push({ kind: "list", items: [bullet[1]] })
    } else if (line.trim() === "") {
      flush()
    } else {
      paragraph.push(line)
    }
  }
  flush()
  return blocks
}

function Description({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-body leading-relaxed text-black/80">
      <h3 className="text-h3 font-semibold leading-tight text-blue-600">
        Description
      </h3>
      {descriptionBlocks(text).map((block, i) =>
        block.kind === "list" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {block.text}
          </p>
        ),
      )}
    </div>
  )
}

// navigator.share is a client-only capability; the server snapshot says
// "no" so the prerendered markup and the hydrating render agree.
const noSubscribe = () => () => {}
const readCanShare = () => typeof navigator.share === "function"
const serverCanShare = () => false

/** Apply / copy / share. Inline in the desktop panel, in the shell footer on phones. */
export function JobActions({ job }: { job: Job }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle")
  const canShare = useSyncExternalStore(noSubscribe, readCanShare, serverCanShare)

  useEffect(() => {
    if (copied === "idle") return
    const t = setTimeout(() => setCopied("idle"), 2500)
    return () => clearTimeout(t)
  }, [copied])

  const shareUrl = () => jobShareUrl(window.location.origin, job.id)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl())
      setCopied("copied")
    } catch {
      setCopied("failed")
    }
  }

  const share = async () => {
    try {
      await navigator.share({
        title: `${job.title} at ${job.company}`,
        text: "Spotted on the MASCA careers board",
        url: shareUrl(),
      })
    } catch {
      // The user dismissed the share sheet — nothing to do.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Apply fills the leftover width of a phone row; the rest keep their natural size. */}
      {job.applyKind === "email" ? (
        <Button variant="accent" href={job.applyHref} className="grow sm:grow-0">
          Apply by email <span aria-hidden>&rarr;</span>
        </Button>
      ) : (
        <Button variant="accent" href={job.applyHref} target="_blank" rel="noopener noreferrer" className="grow sm:grow-0">
          Apply now <span aria-hidden>&rarr;</span>
          <span className="sr-only">(opens in a new tab)</span>
        </Button>
      )}

      <Button variant="outline" type="button" onClick={copyLink} aria-live="polite">
        {copied === "copied" ? (
          <>
            <Check className="size-4" aria-hidden /> Copied
          </>
        ) : (
          <>
            <Link2 className="size-4" aria-hidden /> Copy link
          </>
        )}
      </Button>

      {canShare && (
        <Button variant="ghost" type="button" onClick={share}>
          <Share2 className="size-4" aria-hidden /> Share
        </Button>
      )}

      {copied === "failed" && (
        <span role="status" className="w-full break-all text-caption text-gray-700">
          Copy this link: {typeof window !== "undefined" ? shareUrl() : ""}
        </span>
      )}
    </div>
  )
}