// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AustraliaChapterMap from '@/app/(frontend)/_components/AustraliaChapterMap';

// Plain image stub keeps these interaction tests independent of Next's image loader.
// eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text, @typescript-eslint/no-unused-vars
vi.mock('next/image', () => ({ default: ({ unoptimized: _unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => <img {...props} /> }));
let reducedMotion = false;
let onMotionChange: ((event: { matches: boolean }) => void) | undefined;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const pin = (name: string) => screen.getByRole('button', { name: new RegExp(`^Show ${name},`) });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? 'mouse';
    }
  });
  reducedMotion = false;
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    get matches() { return reducedMotion; },
    addEventListener: (_: string, callback: typeof onMotionChange) => { onMotionChange = callback; },
    removeEventListener: vi.fn(),
  })));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('homepage map tour', () => {
  it('crossfades to the loaded state photo on automatic and manual selection', () => {
    render(<AustraliaChapterMap />);
    const photo = (code: string) => document.querySelector(`img[data-landmark="${code}"]`)!;
    fireEvent.load(photo('NSW'));
    expect(photo('NSW').getAttribute('data-visible')).toBe('true');
    tick(3000);
    // Slow images leave the current backdrop intact until ready.
    expect(photo('NSW').getAttribute('data-visible')).toBe('true');
    fireEvent.load(photo('QLD'));
    expect(photo('QLD').getAttribute('data-visible')).toBe('true');
    expect(photo('NSW').getAttribute('data-visible')).toBe('false');
    fireEvent.load(photo('TAS'));
    expect(photo('TAS').getAttribute('data-visible')).toBe('false');
    fireEvent.click(pin('Tasmania'));
    tick(9000);
    expect(photo('TAS').getAttribute('data-visible')).toBe('true');
    expect(photo('QLD').getAttribute('data-visible')).toBe('false');
  });

  it('advances every three seconds and loops through all seven states', () => {
    render(<AustraliaChapterMap />);
    expect(pin('New South Wales').getAttribute('aria-pressed')).toBe('true');
    tick(2999);
    expect(pin('New South Wales').getAttribute('aria-pressed')).toBe('true');
    tick(1);
    expect(pin('Queensland').getAttribute('aria-pressed')).toBe('true');
    const visited = new Set(['NSW', 'QLD']);
    for (let i = 0; i < 6; i++) {
      tick(3000);
      visited.add(document.querySelector('button[title][aria-pressed="true"]')!.textContent!);
    }
    expect(visited.size).toBe(7);
    expect(pin('New South Wales').getAttribute('aria-pressed')).toBe('true');
  });

  it.each(['pin', 'list'])('keeps a manually selected state until the tour is explicitly resumed (%s)', (control) => {
    render(<AustraliaChapterMap />);
    fireEvent.click(control === 'pin' ? pin('Tasmania') : screen.getByRole('button', { name: 'TAS' }));
    tick(30000);
    expect(pin('Tasmania').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('link', { name: /Open MSST on Instagram/ }).getAttribute('href')).toBe('https://www.instagram.com/mss.tasmania/');
    const resume = screen.getByRole('button', { name: 'Resume automatic state rotation' });
    fireEvent.focus(resume);
    fireEvent.click(resume);
    tick(3000);
    expect(pin('Tasmania').getAttribute('aria-pressed')).toBe('false');
  });

  it('pauses while hovered or keyboard focused so links cannot change during interaction', () => {
    render(<AustraliaChapterMap />);
    const map = screen.getByRole('button', { name: 'Pause automatic state rotation' }).parentElement!;
    fireEvent.pointerEnter(map, { pointerType: 'mouse' });
    tick(9000);
    expect(pin('New South Wales').getAttribute('aria-pressed')).toBe('true');
    fireEvent.pointerLeave(map, { pointerType: 'mouse' });
    fireEvent.focus(pin('New South Wales'));
    tick(9000);
    expect(pin('New South Wales').getAttribute('aria-pressed')).toBe('true');
    fireEvent.blur(pin('New South Wales'), { relatedTarget: null });
    tick(3000);
    expect(pin('Queensland').getAttribute('aria-pressed')).toBe('true');
  });

  it('starts stationary for reduced motion and stops if that preference changes', () => {
    reducedMotion = true;
    render(<AustraliaChapterMap />);
    tick(9000);
    expect(pin('New South Wales').getAttribute('aria-pressed')).toBe('true');
    const resume = screen.getByRole('button', { name: 'Resume automatic state rotation' });
    fireEvent.focus(resume);
    fireEvent.click(resume);
    tick(3000);
    expect(pin('Queensland').getAttribute('aria-pressed')).toBe('true');
    act(() => onMotionChange?.({ matches: true }));
    tick(9000);
    expect(pin('Queensland').getAttribute('aria-pressed')).toBe('true');
  });

  it('does not leave the tour hover-paused after a touch interaction', () => {
    render(<AustraliaChapterMap />);
    const toggle = screen.getByRole('button', { name: 'Pause automatic state rotation' });
    fireEvent.pointerEnter(toggle.parentElement!, { pointerType: 'touch' });
    fireEvent.focus(toggle);
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Resume automatic state rotation' }));
    tick(3000);
    expect(pin('Queensland').getAttribute('aria-pressed')).toBe('true');
  });

  it('stops automatic changes while the page is hidden' , () => {
    render(<AustraliaChapterMap />);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    tick(9000);
    expect(pin('New South Wales').getAttribute('aria-pressed')).toBe('true');
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    tick(3000);
    expect(pin('Queensland').getAttribute('aria-pressed')).toBe('true');
    vi.restoreAllMocks();
  });

  it('cleans up its timer when unmounted', () => {
    const { unmount } = render(<AustraliaChapterMap />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
