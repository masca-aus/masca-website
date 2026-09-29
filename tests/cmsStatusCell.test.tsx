// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EventCMSStatusCell, CareerCMSStatusCell } from '@/components/admin/CMSStatusCell';
const h = vi.hoisted(() => ({ refresh: vi.fn(), fetch: vi.fn() }));
vi.mock('@payloadcms/ui', () => ({ useConfig: () => ({ config: { routes: { api: '/api', admin: '/admin' } } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: h.refresh }) }));
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', h.fetch); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('shows one published badge plus an unpublished changes note', async () => {
 h.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
 render(<EventCMSStatusCell cellData={{ status: 'published', hasChanges: true }} rowData={{ id: 7, title: 'Dinner' }} />);
 expect(screen.getByText('Unpublished changes')).toBeTruthy();
 fireEvent.click(screen.getByRole('button', { name: 'Status for Dinner: Published' }));
 await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Publish changes' })));
 expect(h.fetch).toHaveBeenCalledWith('/api/events/7/quick-status', expect.objectContaining({ body: JSON.stringify({ field: '_status', value: 'published' }) }));
});
it('moves published careers back to draft through the publication endpoint', async () => {
 h.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
 render(<CareerCMSStatusCell cellData={{ status: 'published', hasChanges: false }} rowData={{ id: 8 }} />);
 fireEvent.click(screen.getByRole('button'));
 await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Move to draft' })));
 expect(h.fetch).toHaveBeenCalledWith('/api/careers/8/quick-status', expect.objectContaining({ body: JSON.stringify({ field: '_status', value: 'draft' }) }));
});
it('restores archived content without silently publishing it', async () => {
 h.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
 render(<EventCMSStatusCell cellData={{ status: 'archived', hasChanges: false }} rowData={{ id: 9 }} />);
 fireEvent.click(screen.getByRole('button'));
 expect(screen.queryByRole('menuitem', { name: 'Publish' })).toBeNull();
 await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Restore' })));
 expect(h.fetch).toHaveBeenCalledWith('/api/events/9/lifecycle', expect.objectContaining({ body: JSON.stringify({ action: 'restore' }) }));
});
it('keeps the original badge and surfaces validation errors', async () => {
 h.fetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Enter a valid application link.' }) });
 render(<CareerCMSStatusCell cellData={{ status: 'draft', hasChanges: false }} rowData={{ id: 10 }} />);
 fireEvent.click(screen.getByRole('button'));
 await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Publish' })));
 expect(screen.getByRole('alert').textContent).toContain('Enter a valid application link.');
 expect(screen.getByRole('button').textContent).toBe('Draft');
 expect(h.refresh).not.toHaveBeenCalled();
});
