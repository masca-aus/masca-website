// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventReviewStatusCell, EventPublicationStatusCell } from '@/components/admin/EventStatusCell';
const h = vi.hoisted(() => ({ refresh: vi.fn(), fetch: vi.fn() }));
vi.mock('@payloadcms/ui', () => ({ useConfig: () => ({ config: { routes: { api: '/api', admin: '/admin' } } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: h.refresh }) }));
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', h.fetch); h.refresh.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('event status cells', () => {
  it('saves a selected status immediately and refreshes the current list page', async () => {
    h.fetch.mockResolvedValue({ ok: true, json: async () => ({ doc: { reviewStatus: 'approved', _status: 'draft' } }) });
    const view = render(<EventReviewStatusCell cellData="pending" rowData={{ id: 7, title: 'Dinner' }} />);
    await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'approved' } }); });
    expect(h.fetch).toHaveBeenCalledWith('/api/events/7/quick-status', expect.objectContaining({ method: 'POST', body: JSON.stringify({ field: 'reviewStatus', value: 'approved' }) }));
    expect(h.refresh).toHaveBeenCalledOnce();
    view.rerender(<EventReviewStatusCell cellData="approved" rowData={{ id: 7, title: 'Dinner' }} />);
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'approved');
  });
  it('disables both row controls while a request is pending', async () => {
    let finish!: (value: unknown) => void;
    h.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<><EventReviewStatusCell cellData="pending" rowData={{ id: 8 }} /><EventPublicationStatusCell cellData="draft" rowData={{ id: 8 }} /></>);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'approved' } });
    expect(screen.getAllByRole('combobox').every(select => (select as HTMLSelectElement).disabled)).toBe(true);
    await act(async () => { finish({ ok: true, json: async () => ({ doc: { reviewStatus: 'approved' } }) }); });
    expect(screen.getAllByRole('combobox').every(select => !(select as HTMLSelectElement).disabled)).toBe(true);
  });
  it('keeps the old status and provides an edit link when publication fails validation', async () => {
    h.fetch.mockResolvedValue({ ok: false, json: async () => ({ errors: [{ data: { errors: [{ message: 'Enter an event title.' }] } }] }) });
    render(<EventPublicationStatusCell cellData="draft" rowData={{ id: 9 }} />);
    await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'published' } }); });
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'draft');
    expect(screen.getByRole('alert').textContent).toContain('Enter an event title.');
    expect(screen.getByRole('link', { name: 'Edit event' }).getAttribute('href')).toBe('/admin/collections/events/9');
    expect(h.refresh).not.toHaveBeenCalled();
  });
  it('uses the refreshed review status after another control republishes the event', async () => {
    h.fetch.mockResolvedValue({ ok: true, json: async () => ({ doc: { reviewStatus: 'rejected', _status: 'draft' } }) });
    const view = render(<EventReviewStatusCell cellData="approved" rowData={{ id: 10 }} />);
    await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'rejected' } }); });
    view.rerender(<EventReviewStatusCell cellData="rejected" rowData={{ id: 10 }} />);
    // Publishing from the other column approves the same event again.
    view.rerender(<EventReviewStatusCell cellData="approved" rowData={{ id: 10 }} />);
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'approved');
  });
});
