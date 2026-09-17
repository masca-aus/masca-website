const labels: Record<string, string> = { organisations: 'Organisations', committee: 'Committee', events: 'Events', media: 'Media', sponsors: 'Sponsors', users: 'Users' };
export function adminBackTarget(pathname: string): { href: string; label: string } | null {
  const parts = pathname.replace(/\/$/, '').split('/');
  if (parts[1] !== 'admin') return null;
  if (parts[2] === 'collections' && labels[parts[3]]) {
    return parts[4] ? { href: `/admin/collections/${parts[3]}`, label: `Back to ${labels[parts[3]]}` } : { href: '/admin', label: 'Back to dashboard' };
  }
  return parts[2] === 'account' ? { href: '/admin', label: 'Back to dashboard' } : null;
}
