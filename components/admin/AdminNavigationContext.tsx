'use client';

import NextLink from 'next/link';
import { createContext, useContext, useSyncExternalStore, type ComponentProps } from 'react';
import type { createAdminNavigationMemory, AdminReturnLocation } from './adminNavigation';

type Navigation = {
  memory: ReturnType<typeof createAdminNavigationMemory>;
  navigate: (href: string, options?: { scroll?: boolean; restore?: AdminReturnLocation }) => void;
};
export const AdminNavigationContext = createContext<Navigation | null>(null);
export const useAdminNavigation = () => useContext(AdminNavigationContext);
const subscribeNothing = () => () => {};
const noLocation = () => undefined;

/** Normal links remain progressive-enhanced and keep modified-click behaviour. */
export function AdminLink({ href, restoreContext = false, onNavigate, ...props }: ComponentProps<typeof NextLink> & { restoreContext?: boolean }) {
  const navigation = useAdminNavigation();
  const remembered = useSyncExternalStore(navigation?.memory.subscribe ?? subscribeNothing,
    () => restoreContext && typeof href === 'string' ? navigation?.memory.get(href) : undefined, noLocation);
  const destination = remembered?.href ?? href;
  return <NextLink {...props} href={destination} onNavigate={event => {
    let cancelled = false;
    onNavigate?.({ preventDefault() { cancelled = true; event.preventDefault(); } });
    if (!navigation || typeof destination !== 'string' || !destination.startsWith('/admin') || cancelled) return;
    event.preventDefault();
    navigation.navigate(destination, { scroll: remembered ? false : props.scroll, restore: remembered });
  }} />;
}
