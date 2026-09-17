// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventReviewStatusCell, EventPublicationStatusCell } from '@/components/admin/EventStatusCell';
import { CareerPublicationStatusCell } from '@/components/admin/CareerStatusCell';
import { EventLifecycleCell } from '@/components/admin/EventLifecycleCell';
const h = vi.hoisted(() => ({ refresh: vi.fn(), fetch: vi.fn() }));
vi.mock('@payloadcms/ui', () => ({ useConfig: () => ({ config: { routes: { api: '/api', admin: '/admin' } } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: h.refresh }) }));
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', h.fetch); h.refresh.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('event status cells', () => {
  it('saves a selected status immediately and refreshes the current list page', async () => {
    h.fetch.mockResolvedValue({ ok: true, json: async () => ({ doc: { reviewStatus: 'approved', _status: 'draft' } }) });
    const view = render(<EventReviewStatusCell cellData="pending" rowData={{ id: 7, title: 'Dinner' }} />);
    fireEvent.click(screen.getByRole('button'));
    await act(async () => { fireEvent.click(screen.getByRole('menuitemradio', { name: 'Approved' })); });
    expect(h.fetch).toHaveBeenCalledWith('/api/events/7/quick-status', expect.objectContaining({ method: 'POST', body: JSON.stringify({ field: 'reviewStatus', value: 'approved' }) }));
    expect(h.refresh).toHaveBeenCalledOnce();
    view.rerender(<EventReviewStatusCell cellData="approved" rowData={{ id: 7, title: 'Dinner' }} />);
    expect(screen.getByRole('button')).toHaveProperty('textContent', 'Approved');
  });
  it('disables both row controls while a request is pending', async () => {
    let finish!: (value: unknown) => void;
    h.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<><EventReviewStatusCell cellData="pending" rowData={{ id: 8 }} /><EventPublicationStatusCell cellData="draft" rowData={{ id: 8 }} /></>);
    fireEvent.click(screen.getAllByRole('button')[0]); fireEvent.click(screen.getByRole('menuitemradio', { name: 'Approved' }));
    expect(screen.getAllByRole('button').every(select => (select as HTMLSelectElement).disabled)).toBe(true);
    await act(async () => { finish({ ok: true, json: async () => ({ doc: { reviewStatus: 'approved' } }) }); });
    expect(screen.getAllByRole('button').every(select => !(select as HTMLSelectElement).disabled)).toBe(true);
  });
  it('keeps the old status and provides an edit link when publication fails validation', async () => {
    h.fetch.mockResolvedValue({ ok: false, json: async () => ({ errors: [{ data: { errors: [{ message: 'Enter an event title.' }] } }] }) });
    render(<EventPublicationStatusCell cellData="draft" rowData={{ id: 9 }} />);
    fireEvent.click(screen.getByRole('button'));
    await act(async () => { fireEvent.click(screen.getByRole('menuitem', { name: 'Publish' })); });
    expect(screen.getByRole('button')).toHaveProperty('textContent', 'Draft');
    expect(screen.getByRole('alert').textContent).toContain('Enter an event title.');
    expect(screen.getByRole('link', { name: 'Edit event' }).getAttribute('href')).toBe('/admin/collections/events/9');
    expect(h.refresh).not.toHaveBeenCalled();
  });
  it('uses the refreshed review status after another control republishes the event', async () => {
    h.fetch.mockResolvedValue({ ok: true, json: async () => ({ doc: { reviewStatus: 'rejected', _status: 'draft' } }) });
    const view = render(<EventReviewStatusCell cellData="approved" rowData={{ id: 10 }} />);
    fireEvent.click(screen.getByRole('button'));
    await act(async () => { fireEvent.click(screen.getByRole('menuitemradio', { name: 'Rejected (unpublish)' })); });
    view.rerender(<EventReviewStatusCell cellData="rejected" rowData={{ id: 10 }} />);
    // Publishing from the other column approves the same event again.
    view.rerender(<EventReviewStatusCell cellData="approved" rowData={{ id: 10 }} />);
    expect(screen.getByRole('button')).toHaveProperty('textContent', 'Approved');
  });
});

describe.each([['events', EventPublicationStatusCell], ['careers', CareerPublicationStatusCell]] as const)('%s publication flow', (collection, Cell) => {
 it('makes unpublished edits explicit and publishes them through the correct endpoint', async () => {
  h.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  render(<Cell cellData="changed" rowData={{ id: 42, title: 'Example' }} />);
  fireEvent.click(screen.getByRole('button', { name: /Unpublished edits/ }));
  await act(async () => { fireEvent.click(screen.getByRole('menuitem', { name: 'Publish changes' })); });
  expect(h.fetch).toHaveBeenCalledWith(`/api/${collection}/42/quick-status`, expect.objectContaining({ body: JSON.stringify({ field: '_status', value: 'published' }) }));
 });
 it('offers an explicit unpublish action for published content', async () => {
  h.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  render(<Cell cellData="published" rowData={{ id: 43 }} />);
  fireEvent.click(screen.getByRole('button'));
  await act(async () => { fireEvent.click(screen.getByRole('menuitem', { name: 'Unpublish' })); });
  expect(h.fetch).toHaveBeenCalledWith(`/api/${collection}/43/quick-status`, expect.objectContaining({ body: JSON.stringify({ field: '_status', value: 'draft' }) }));
 });
});
it('keeps event stage actions separate from internal audit records', async () => {
 h.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
 render(<EventLifecycleCell cellData="completed" rowData={{ id: 44, title: 'Dinner' }} />);
 fireEvent.click(screen.getByRole('button', { name: 'Event stage for Dinner: Completed' }));
 expect(screen.queryByRole('menuitem', { name: /history/i })).toBeNull();
 await act(async () => { fireEvent.click(screen.getByRole('menuitem', { name: 'Reopen event' })); });
 expect(h.fetch).toHaveBeenCalledWith('/api/events/44/lifecycle', expect.objectContaining({ body: JSON.stringify({ action: 'reopen' }) }));
});

it('names approval and unpublishing side effects in event menus', () => {
 const view = render(<EventPublicationStatusCell cellData="draft" rowData={{ id: 45, reviewStatus: 'pending' }} />);
 fireEvent.click(screen.getByRole('button'));
 expect(screen.getByRole('menuitem', { name: 'Approve & publish' })).toBeTruthy();
 view.unmount();
 render(<EventReviewStatusCell cellData="approved" rowData={{ id: 45, _status: 'published' }} />);
 fireEvent.click(screen.getByRole('button'));
 expect(screen.getByRole('menuitemradio', { name: 'Pending (unpublish)' })).toBeTruthy();
 expect(screen.getByRole('menuitemradio', { name: 'Rejected (unpublish)' })).toBeTruthy();
});
