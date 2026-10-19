import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Committee } from '@/payload-types'
import { getCommitteeYears, toCommitteeMember } from '@/utils/committee'
import CommitteeSection from '../committee/CommitteeSection'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Committee design preview', robots: { index: false, follow: false } }

// Review the design with the already-public council, without copying or changing
// CMS records in either database. This review route is unavailable in production.
export default async function CommitteeDesignPreview() {
  if (process.env.VERCEL_ENV === 'production') notFound()
  const response = await fetch('https://www.masca.org.au/api/committee?limit=100&depth=1&sort=_order&where%5B_status%5D%5Bequals%5D=published', { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not load the published committee for the design preview')
  const { docs } = await response.json() as { docs: Committee[] }
  const members = docs.filter(member => member._status === 'published').map(toCommitteeMember)
  return <main id="main">
    <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-24">
      <div className="container flex flex-col gap-6">
        <span className="eyebrow text-yellow-500">the yearbook</span>
        <h1 className="max-w-3xl text-white text-4xl md:text-5xl lg:text-6xl">Meet the students <span className="font-accent font-normal text-yellow-500">steering MASCA</span></h1>
        <p className="max-w-xl text-blue-100/80 md:text-lg">Elected each year to represent Malaysian students across Australia — these are the faces behind the council.</p>
      </div>
    </section>
    <CommitteeSection members={members} years={getCommitteeYears(members)} />
  </main>
}
