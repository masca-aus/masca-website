/** Only read-only landing views are warmed; editors may acquire document locks. */
export function isAdminNavigationTarget(href: string): boolean {
  return !href.includes('#') && /^\/admin(?:\/collections\/[a-zA-Z0-9_-]+|\/account)?\/?(?:\?[^#]*)?$/.test(href);
}

export function adminNavigationPath(href: string): string {
  return href.split('?', 1)[0].replace(/\/$/, '');
}

export type AdminReturnLocation = { href: string; scrollY: number };

/** Per-mounted-session UI context only. Records and credentials are never cached. */
export function createAdminNavigationMemory() {
  const locations = new Map<string, AdminReturnLocation>();
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    remember(href: string, scrollY: number) {
      const path = adminNavigationPath(href);
      if (!isAdminNavigationTarget(href) || path === '/admin/account') return;
      const previous = locations.get(path);
      // Scroll updates need not rerender links; preserve the shared location object.
      if (previous?.href === href) { previous.scrollY = scrollY; return; }
      locations.set(path, { href, scrollY });
      listeners.forEach(listener => listener());
    },
    get(href: string) { return href.includes('?') || href.includes('#') ? undefined : locations.get(adminNavigationPath(href)); },
  };
}
