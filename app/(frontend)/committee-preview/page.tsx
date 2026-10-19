import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { CommitteeMember } from '@/utils/committee'
import publishedMembers from './members.json'
import CommitteeSection from '../committee/CommitteeSection'

export const metadata: Metadata = { title: 'Committee design preview', robots: { index: false, follow: false } }

// Public council snapshot captured 19 October 2026 for a reproducible visual review.
// No CMS connection or writes; this route is unavailable in production.
export default function CommitteeDesignPreview() {
  if (process.env.VERCEL_ENV === 'production') notFound()
  const members = publishedMembers as CommitteeMember[]
  const years = [...new Set(members.map(member => member.year))].sort((a, b) => b.localeCompare(a))
  return <main id="main">
    <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-24">
      <div className="container flex flex-col gap-6">
        <span className="eyebrow text-yellow-500">the yearbook</span>
        <h1 className="max-w-3xl text-white text-4xl md:text-5xl lg:text-6xl">Meet the students <span className="font-accent font-normal text-yellow-500">steering MASCA</span></h1>
        <p className="max-w-xl text-blue-100/80 md:text-lg">Elected each year to represent Malaysian students across Australia — these are the faces behind the council.</p>
      </div>
    </section>
    <CommitteeSection members={members} years={years} />
  </main>
}
