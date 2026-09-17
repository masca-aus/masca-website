// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CareerLifecycleCell } from '@/components/admin/CareerLifecycleCell';
import { CareerListTools } from '@/components/admin/CareerListTools';
const h = vi.hoisted(() => ({ refresh: vi.fn(), view: 'closed' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: h.refresh }), useSearchParams: () => new URLSearchParams({ careerView: h.view }), usePathname: () => '/admin/collections/careers' }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it('selects the requested career list with accessible tabs', () => {
  render(<CareerListTools />);
  expect(screen.getByRole('link', { name: 'Closed' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Active' }).getAttribute('href')).toBe('/admin/collections/careers?careerView=active');
});
it('sends lifecycle changes separately from draft content', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }); vi.stubGlobal('fetch', fetcher);
  render(<CareerLifecycleCell rowData={{ id: 12, title: 'Engineer' }} cellData="closed" />);
  fireEvent.click(screen.getByRole('button', { name: 'Listing state for Engineer: Closed' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Reopen opportunity' }));
  await waitFor(() => expect(h.refresh).toHaveBeenCalledOnce());
  expect(fetcher).toHaveBeenCalledWith('/api/careers/12/lifecycle', expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'reopen' }) }));
});
it('shows failed lifecycle actions without claiming success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Please sign in again.' }) }));
  render(<CareerLifecycleCell rowData={{ id: 12 }} cellData="archived" />);
  fireEvent.click(screen.getByRole('button'));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Restore opportunity' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Please sign in again.'));
  expect(h.refresh).not.toHaveBeenCalled();
});
