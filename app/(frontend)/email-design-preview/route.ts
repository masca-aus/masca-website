import { buildListingEmail } from '@/features/submissions/listingEmail'

/** Sample content only. This visual review route is unavailable in production. */
export function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') return new Response('Not found', { status: 404 })
  const search = new URL(request.url).searchParams
  const collection = search.get('collection') === 'careers' ? 'careers' : 'events'
  const kind = (['receipt', 'approval', 'update', 'change-link'] as const).find(value => value === search.get('kind')) || 'receipt'
  const email = buildListingEmail(collection, {
    title: collection === 'events' ? 'Community Networking Night' : 'Graduate Analyst',
    contactName: 'MASCA organiser',
    contactEmail: 'organiser@example.invalid',
    organisation: 'Malaysian and Singaporean Students Association',
    company: 'Example Organisation',
    startDate: '2026-10-25T08:00:00Z',
    closes: '30 November 2026',
    venue: 'Brisbane City', city: 'Brisbane', state: 'QLD', country: 'Australia',
    slug: 'sample-graduate-analyst',
  }, kind, {
    changeURL: 'https://example.invalid/submission-change/demo',
    resolution: 'We’ve reviewed your request and updated the listing details. Thank you for keeping us informed.',
  })
  return new Response(email.html, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Robots-Tag': 'noindex, nofollow',
    'Cache-Control': 'no-store',
  } })
}
