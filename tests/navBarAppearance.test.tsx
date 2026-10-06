// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NavBar from '@/components/NavBar';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
let pathname = '/';
let frames: Map<number, FrameRequestCallback>;
let frameId = 0;
const flushFrame = () => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); });
const renderNav = () => { const result = render(<NavBar />); flushFrame(); return result; };
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@gsap/react', () => ({ useGSAP: () => {} }));
// eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text, @typescript-eslint/no-unused-vars
vi.mock('next/image', () => ({ default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => <img {...props} /> }));
const scrollTo = (y: number) => { vi.stubGlobal('scrollY', y); fireEvent.scroll(window); flushFrame(); };
const transparent = () => screen.getByRole('banner').getAttribute('data-transparent');
beforeEach(() => { pathname = '/'; vi.stubGlobal('scrollY', 0); frames = new Map(); vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; }); vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id)); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('homepage navigation appearance', () => {
  it('recognises the deployed /index homepage alias on direct loads', () => {
    pathname = '/index';
    renderNav();
    expect(transparent()).toBe('true');
    scrollTo(100);
    expect(transparent()).toBe('false');
    scrollTo(0);
    expect(transparent()).toBe('true');
  });
  it('ignores temporary scroll values used during layout measurement', () => {
    const subscribe = vi.spyOn(ScrollTrigger, 'addEventListener');
    renderNav();
    vi.stubGlobal('scrollY', 200);
    fireEvent.scroll(window);
    const refresh = subscribe.mock.calls.find(([event]) => event === 'refresh')?.[1];
    act(() => { refresh?.(); });
    // The animation system restores position after its synchronous callbacks.
    vi.stubGlobal('scrollY', 0);
    flushFrame();
    expect(transparent()).toBe('true');
  });
  it('resyncs after animation layout measurements restore the scroll position', () => {
    const subscribe = vi.spyOn(ScrollTrigger, 'addEventListener');
    renderNav();
    scrollTo(200);
    expect(transparent()).toBe('false');
    vi.stubGlobal('scrollY', 0);
    const refresh = subscribe.mock.calls.find(([event]) => event === 'refresh')?.[1];
    expect(refresh).toBeDefined();
    act(() => { refresh?.(); });
    flushFrame();
    expect(transparent()).toBe('true');
  });
  it('starts transparent and becomes solid at 60px, then restores at the top', () => {
    renderNav();
    expect(transparent()).toBe('true');
    scrollTo(59); expect(transparent()).toBe('true');
    scrollTo(60); expect(transparent()).toBe('false');
    scrollTo(0); expect(transparent()).toBe('true');
  });
  it('starts solid when the page is already scrolled', () => {
    vi.stubGlobal('scrollY', 200);
    renderNav();
    expect(transparent()).toBe('false');
  });
  it('keeps other routes solid and updates on navigation', () => {
    pathname = '/about';
    const { rerender } = renderNav();
    expect(transparent()).toBe('false');
    pathname = '/'; rerender(<NavBar />);
    expect(transparent()).toBe('true');
    pathname = '/events'; rerender(<NavBar />);
    expect(transparent()).toBe('false');
  });
  it('uses a solid header for the mobile menu and restores transparency on close', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(transparent()).toBe('false');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(transparent()).toBe('true');
    expect(document.body.style.overflow).toBe('');
  });
});
