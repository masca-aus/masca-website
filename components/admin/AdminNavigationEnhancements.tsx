'use client';

import { useAuth, useRouteTransition } from '@payloadcms/ui';
import { PrefetchKind } from 'next/dist/client/components/router-reducer/router-reducer-types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AccountNavigation } from './AccountNavigation';
import { AdminNavigationContext } from './AdminNavigationContext';
import { adminNavigationPath, createAdminNavigationMemory, isAdminNavigationTarget, type AdminReturnLocation } from './adminNavigation';

export function AdminNavigationEnhancements({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  // Clear remembered context across sign-in/sign-out without persistent browser storage.
  return <NavigationSession key={user?.id ?? 'guest'}>{children}</NavigationSession>;
}

function NavigationSession({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();
  const { startRouteTransition } = useRouteTransition();
  const [memory] = useState(createAdminNavigationMemory);
  const restore = useRef<AdminReturnLocation | undefined>(undefined);

  useEffect(() => {
    const href = `${pathname}${search ? `?${search}` : ''}`;
    const pending = restore.current;
    restore.current = undefined;
    const frame = pending && adminNavigationPath(pending.href) === pathname
      ? requestAnimationFrame(() => window.scrollTo({ top: pending.scrollY, behavior: 'instant' })) : undefined;
    const remember = () => { if (window.location.pathname === pathname) memory.remember(href, window.scrollY); };
    remember();
    window.addEventListener('scroll', remember, { passive: true });
    return () => { window.removeEventListener('scroll', remember); if (frame !== undefined) cancelAnimationFrame(frame); };
  }, [pathname, search, memory]);

  useEffect(() => {
    // Animate the incoming section only; keep navigation and the app header still.
    // Query/filter changes and data refreshes must not replay the entrance.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = document.querySelector('.template-default__wrap .collection-list, .template-default__wrap .collection-edit');
    const content = section ?? document.querySelector('.template-default__wrap');
    // The dashboard already has its own coordinated panel entrance.
    if (!content || content.querySelector('.masca-dashboard')) return;
    const animation = section
      ? content.animate?.([{ opacity: 0.9, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' })
      : content.animate?.([{ opacity: 0.85 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [pathname]);

  useEffect(() => {
    const warmed = new Map<string, number>();
    const warm = (event: Event) => {
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      const href = anchor?.getAttribute('href');
      if (!href || !isAdminNavigationTarget(href) || anchor?.hasAttribute('download') || (anchor?.target && anchor.target !== '_self')) return;
      const now = Date.now();
      if (now - (warmed.get(href) ?? 0) < 30_000) return;
      warmed.set(href, now);
      if (warmed.size > 32) warmed.delete(warmed.keys().next().value!);
      router.prefetch(href, { kind: PrefetchKind.FULL, onInvalidate: () => { warmed.delete(href); } });
    };
    document.addEventListener('pointerover', warm, true);
    document.addEventListener('focusin', warm, true);
    return () => { document.removeEventListener('pointerover', warm, true); document.removeEventListener('focusin', warm, true); };
  }, [router]);

  const navigation = useMemo(() => ({ memory, navigate(href: string, options?: { scroll?: boolean; restore?: AdminReturnLocation }) {
    memory.remember(`${window.location.pathname}${window.location.search}`, window.scrollY);
    restore.current = options?.restore ? { ...options.restore } : undefined;
    startRouteTransition(() => router.push(href, { scroll: options?.scroll }));
  } }), [memory, router, startRouteTransition]);

  return <AdminNavigationContext.Provider value={navigation}>
    {pathname === '/admin/account' ? <div className="masca-account-page"><AccountNavigation />{children}</div> : children}
  </AdminNavigationContext.Provider>;
}
