// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroSection from '@/app/(frontend)/sections/hero';
vi.mock('@gsap/react', () => ({ useGSAP: () => {} }));

// Plain image stub keeps these interaction tests independent of Next's image loader.
// eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text, @typescript-eslint/no-unused-vars
vi.mock('next/image', () => ({ default: ({ unoptimized: _unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => <img {...props} /> }));
let reducedMotion = false;
let onMotionChange: ((event: { matches: boolean }) => void) | undefined;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const pin = (name: string) => screen.getByRole('button', { name: new RegExp(`^Show ${name},`) });

const renderLoadedHero = () => {
  const result = render(<HeroSection />);
  fireEvent.load(result.container.querySelector('img[src="/australia-states.svg"]')!);
  tick(1000);
  return result;
};

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
  it.each(['load', 'error'])('waits for the map entrance before starting the tour (%s)', (event) => {
    const { container } = render(<HeroSection />);
    tick(9000);
    expect(pin('New South Wales').getAttribute('aria-pressed')).toBe('true');
    const mapImage = container.querySelector('img[src="/australia-states.svg"]')!;
    fireEvent(mapImage, new Event(event));
    tick(1000);
    tick(2999);
    expect(pin('New South Wales').getAttribute('aria-pressed')).toBe('true');
    tick(1);
    expect(pin('Queensland').getAttribute('aria-pressed')).toBe('true');
  });
  it('places the photographs across the hero outside the map controls', () => {
    const { container } = renderLoadedHero();
    const photo = container.querySelector('img[data-landmark]')!;
    expect(photo.closest('[data-homepage-hero]')?.tagName).toBe('SECTION');
  });
  it('crossfades to the loaded state photo on automatic and manual selection', () => {
    renderLoadedHero();
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

  it('alternates landmarks and universities on successive laps and holds a manual choice', () => {
    renderLoadedHero();
    for (let i = 0; i < 7; i++) tick(3000);
    const university = document.querySelector('img[data-photo="NSW-university"]');
    expect(university).not.toBeNull();
    fireEvent.load(university!);
    expect(university!.getAttribute('data-visible')).toBe('true');
    fireEvent.click(pin('New South Wales'));
    tick(30000);
    expect(university!.getAttribute('data-visible')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Resume automatic state rotation' }));
    for (let i = 0; i < 7; i++) tick(3000);
    const landmark = document.querySelector('img[data-photo="NSW-landmark"]')!;
    fireEvent.load(landmark);
    expect(landmark.getAttribute('data-visible')).toBe('true');
    expect(university!.getAttribute('data-visible')).toBe('false');
  });

  it('advances every three seconds and loops through all seven states', () => {
    renderLoadedHero();
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
    renderLoadedHero();
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
    renderLoadedHero();
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
    renderLoadedHero();
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
    renderLoadedHero();
    const toggle = screen.getByRole('button', { name: 'Pause automatic state rotation' });
    fireEvent.pointerEnter(toggle.parentElement!, { pointerType: 'touch' });
    fireEvent.focus(toggle);
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Resume automatic state rotation' }));
    tick(3000);
    expect(pin('Queensland').getAttribute('aria-pressed')).toBe('true');
  });

  it('stops automatic changes while the page is hidden' , () => {
    renderLoadedHero();
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
    const { unmount } = renderLoadedHero();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
