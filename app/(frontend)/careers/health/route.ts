// Diagnostics and unpublished content now belong in the authenticated CMS.
export function GET() {
  return new Response(null, { status: 307, headers: { location: "/admin/collections/careers", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
