// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NavBar from '@/components/NavBar';
let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@gsap/react', () => ({ useGSAP: () => {} }));
// eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text, @typescript-eslint/no-unused-vars
vi.mock('next/image', () => ({ default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => <img {...props} /> }));
const scrollTo = (y: number) => { vi.stubGlobal('scrollY', y); fireEvent.scroll(window); };
const transparent = () => screen.getByRole('banner').getAttribute('data-transparent');
beforeEach(() => { pathname = '/'; vi.stubGlobal('scrollY', 0); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('homepage navigation appearance', () => {
  it('starts transparent and becomes solid at 60px, then restores at the top', () => {
    render(<NavBar />);
    expect(transparent()).toBe('true');
    scrollTo(59); expect(transparent()).toBe('true');
    scrollTo(60); expect(transparent()).toBe('false');
    scrollTo(0); expect(transparent()).toBe('true');
  });
  it('starts solid when the page is already scrolled', () => {
    vi.stubGlobal('scrollY', 200);
    render(<NavBar />);
    expect(transparent()).toBe('false');
  });
  it('keeps other routes solid and updates on navigation', () => {
    pathname = '/about';
    const { rerender } = render(<NavBar />);
    expect(transparent()).toBe('false');
    pathname = '/'; rerender(<NavBar />);
    expect(transparent()).toBe('true');
    pathname = '/events'; rerender(<NavBar />);
    expect(transparent()).toBe('false');
  });
  it('uses a solid header for the mobile menu and restores transparency on close', () => {
    render(<NavBar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(transparent()).toBe('false');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(transparent()).toBe('true');
    expect(document.body.style.overflow).toBe('');
  });
});
