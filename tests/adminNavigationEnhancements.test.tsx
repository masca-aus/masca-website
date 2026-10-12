// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import type { NextRouter } from 'next/router';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
const state = vi.hoisted(() => ({ path:'/admin/collections/events', search:'page=3&branch=QLD', user:1, push:vi.fn(), prefetch:vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname:()=>state.path, useSearchParams:()=>new URLSearchParams(state.search), useRouter:()=>router }));
vi.mock('@payloadcms/ui', () => ({ useAuth:()=>({user:{id:state.user}}), useRouteTransition:()=>({startRouteTransition:(fn:()=>void)=>fn()}) }));
vi.mock('@/components/admin/AccountNavigation', () => ({AccountNavigation:()=>null}));
import { AdminNavigationEnhancements } from '@/components/admin/AdminNavigationEnhancements';
import { AdminLink } from '@/components/admin/AdminNavigationContext';
const router = { push:state.push, prefetch:state.prefetch, replace:vi.fn(), back:vi.fn(), forward:vi.fn(), refresh:vi.fn() } as unknown as AppRouterInstance;
const scrollTo = vi.fn();
beforeEach(() => {
  state.path='/admin/collections/events'; state.search='page=3&branch=QLD'; state.user=1;
  window.history.replaceState(null,'',`${state.path}?${state.search}`);
  Object.defineProperty(window,'scrollY',{value:0,writable:true,configurable:true});
  vi.stubGlobal('scrollTo',scrollTo);
  vi.stubGlobal('matchMedia',()=>({matches:true}));
  vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{fn(0);return 1;});
  vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.clearAllMocks();
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function App() { return <RouterContext.Provider value={router as unknown as NextRouter}><AdminNavigationEnhancements>
  <AdminLink restoreContext href="/admin/collections/events">Back to events</AdminLink>
  <AdminLink href="/admin/collections/events?where[_status][equals]=published">Published</AdminLink>
  <AdminLink href="/admin/collections/events/17">Edit</AdminLink>
  <AdminLink prefetch={false} href="/admin/logout">Log out</AdminLink>
</AdminNavigationEnhancements></RouterContext.Provider>; }
it('returns to the exact list query and restores scroll after the destination commits', () => {
  const view=render(<App />);
  Object.defineProperty(window,'scrollY',{value:420,writable:true});
  fireEvent.scroll(window);
  state.path='/admin/collections/events/17';state.search='';
  window.history.replaceState(null,'',state.path);
  view.rerender(<App />);
  expect(screen.getByText('Back to events').getAttribute('href')).toBe('/admin/collections/events?page=3&branch=QLD');
  expect(screen.getByText('Published').getAttribute('href')).toBe('/admin/collections/events?where[_status][equals]=published');
  fireEvent.click(screen.getByText('Back to events'));
  expect(state.push).toHaveBeenCalledWith('/admin/collections/events?page=3&branch=QLD',{scroll:false});
  state.path='/admin/collections/events';state.search='page=3&branch=QLD';
  window.history.replaceState(null,'',`${state.path}?${state.search}`);
  view.rerender(<App />);
  expect(scrollTo).toHaveBeenCalledWith({top:420,behavior:'instant'});
});
it('warms keyboard-focused lists, skips logout/editors, and warms again after invalidation', () => {
  render(<App />);state.prefetch.mockClear();
  fireEvent.focusIn(screen.getByText('Published'));
  expect(state.prefetch).toHaveBeenCalledWith('/admin/collections/events?where[_status][equals]=published',expect.objectContaining({onInvalidate:expect.any(Function)}));
  const invalidate=state.prefetch.mock.calls[0][1].onInvalidate;
  fireEvent.pointerOver(screen.getByText('Published'));
  fireEvent.pointerOver(screen.getByText('Log out'));
  fireEvent.pointerOver(screen.getByText('Edit'));
  expect(state.prefetch).toHaveBeenCalledTimes(1);
  invalidate();fireEvent.focusIn(screen.getByText('Published'));
  expect(state.prefetch).toHaveBeenCalledTimes(2);
});
it('clears remembered filters when the signed-in account changes', () => {
  const view=render(<App />);
  state.path='/admin/collections/events/17';state.search='';
  window.history.replaceState(null,'',state.path);view.rerender(<App />);
  state.user=2;view.rerender(<App />);
  expect(screen.getByText('Back to events').getAttribute('href')).toBe('/admin/collections/events');
});
it('leaves modified clicks and cancelled navigation to the browser and existing guards', () => {
  render(<App />);
  const suppressBrowserTab = (event: MouseEvent) => { if (event.ctrlKey) event.preventDefault(); };
  document.addEventListener('click', suppressBrowserTab);
  fireEvent.click(screen.getByText('Published'),{ctrlKey:true});
  document.removeEventListener('click', suppressBrowserTab);
  expect(state.push).not.toHaveBeenCalled();
  const prevent=(e:Event)=>{e.preventDefault();e.stopPropagation();};
  document.addEventListener('click',prevent,true);
  fireEvent.click(screen.getByText('Published'));
  document.removeEventListener('click',prevent,true);
  expect(state.push).not.toHaveBeenCalled();
});
