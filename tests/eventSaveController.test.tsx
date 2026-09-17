// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventSaveController } from '@/components/admin/EventSaveController';

type Intent = 'draft' | 'publish' | 'exit' | 'unpublish';
const h = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  modified: false,
  document: {} as Record<string, unknown>,
  save: { current: null as null | ((intent: Intent) => Promise<boolean>) },
  fetch: vi.fn(), setSubmitted: vi.fn(), submit: vi.fn(), setModified: vi.fn(), setBackgroundProcessing: vi.fn(), dispatchFields: vi.fn(),
  registerSave: (handler: null | ((intent: Intent) => Promise<boolean>)) => { h.save.current = handler; },
  setStep: vi.fn(), setError: vi.fn(), push: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock('@payloadcms/ui', () => ({
  useConfig: () => ({ config: { routes: { api: '/api' } } }),
  useDocumentInfo: () => h.document,
  useFormModified: () => h.modified,
  useFormFields: (selector: (state: [Record<string, { value: unknown }>]) => unknown) => selector([Object.fromEntries(Object.entries(h.data).map(([key, value]) => [key, { value }]))]),
  useForm: () => ({ getData: () => ({ ...h.data }), getFields: () => ({}), setSubmitted: h.setSubmitted, submit: h.submit, setModified: h.setModified, setBackgroundProcessing: h.setBackgroundProcessing, dispatchFields: h.dispatchFields }),
}));
vi.mock('@/components/admin/EventEditorView', async () => {
  const { useState } = await import('react');
  return { useEventEditor: () => {
    const [saveState, setSaveState] = useState('idle');
    return { save: h.save, registerSave: h.registerSave, saveState, setSaveState, setError: h.setError, setStep: h.setStep };
  } };
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  h.data = { title: 'Dinner', organisation: 'MASCA', description: 'Student dinner', startDate: '2026-10-01T10:00:00Z', venue: 'Hall', state: 'QLD', contactName: 'Alex', contactEmail: 'alex@example.com', reviewStatus: 'pending', _status: 'draft' };
  h.modified = false;
  h.save.current = null;
  h.document = { id: 7, data: { id: 7 }, isInitializing: false, hasSavePermission: true, uploadStatus: undefined, setHasPublishedDoc: vi.fn(), setMostRecentVersionIsAutosaved: vi.fn(), setUnpublishedVersionCount: vi.fn() };
  h.submit.mockResolvedValue({ res: { ok: true } });
  h.fetch.mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', h.fetch);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

async function advance(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

async function save(intent: Intent) {
  let result: boolean | undefined;
  await act(async () => { result = await h.save.current?.(intent); });
  return result;
}

describe('event save controller', () => {
  it('does not save initial data and waits two seconds after the latest edit', async () => {
    const view = render(<EventSaveController />);
    await advance(5000);
    expect(h.submit).not.toHaveBeenCalled();
    h.data = { ...h.data, title: 'First edit' }; h.modified = true;
    view.rerender(<EventSaveController />);
    await advance(1500);
    h.data = { ...h.data, title: 'Latest edit' };
    view.rerender(<EventSaveController />);
    await advance(1999);
    expect(h.submit).not.toHaveBeenCalled();
    await advance(1);
    expect(h.submit).toHaveBeenCalledOnce();
    expect(h.submit).toHaveBeenCalledWith(expect.objectContaining({ action: '/api/events/7?depth=0&draft=true&autosave=true', method: 'PATCH', skipValidation: true, acceptValues: { overrideLocalChanges: false }, overrides: { _status: 'draft' } }));
  });

  it('retains modified data after a failed save and supports an explicit retry', async () => {
    h.submit.mockResolvedValueOnce({ res: { ok: false } });
    const view = render(<EventSaveController />);
    h.data = { ...h.data, title: 'Unsaved edit' }; h.modified = true;
    view.rerender(<EventSaveController />);
    await advance(2000);
    expect(screen.getByRole('status').textContent).toBe('Save failed');
    expect(h.setModified).toHaveBeenCalledWith(true);
    expect(h.data.title).toBe('Unsaved edit');
    await advance(10000);
    expect(h.submit).toHaveBeenCalledOnce();
    expect(await save('draft')).toBe(true);
    expect(h.submit).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toBe('Saved');
  });

  it('keeps edits made during a save modified and autosaves them afterwards', async () => {
    let finishDraft!: (value: { res: { ok: boolean } }) => void;
    h.submit.mockImplementationOnce(() => new Promise(resolve => { finishDraft = resolve; }));
    h.setModified.mockImplementation(value => { h.modified = value; });
    const view = render(<EventSaveController />);
    h.data = { ...h.data, title: 'First saved title' }; h.modified = true;
    view.rerender(<EventSaveController />);
    await advance(2000);
    expect(h.setBackgroundProcessing).toHaveBeenLastCalledWith(true);
    h.data = { ...h.data, title: 'Edited during save' };
    view.rerender(<EventSaveController />);
    // Model an adapter clearing its dirty flag while returning the old snapshot.
    h.modified = false;
    await act(async () => { finishDraft({ res: { ok: true } }); await Promise.resolve(); });
    expect(h.setBackgroundProcessing).toHaveBeenLastCalledWith(false);
    expect(h.modified).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('Unsaved changes');
    await advance(2000);
    expect(h.submit).toHaveBeenCalledTimes(2);
    expect(h.data.title).toBe('Edited during save');
    expect(screen.getByRole('status').textContent).toBe('Saved');
  });

  it('publishes with both approved review and published document status', async () => {
    render(<EventSaveController />);
    expect(await save('publish')).toBe(true);
    expect(h.submit).toHaveBeenCalledWith(expect.objectContaining({ action: '/api/events/7?depth=0', method: 'PATCH', skipValidation: false, acceptValues: true, overrides: { _status: 'published', reviewStatus: 'approved', reviewedAt: expect.any(String) } }));
    expect(h.document.setHasPublishedDoc).toHaveBeenCalledWith(true);
  });

  it('waits for an in-flight autosave before publishing the latest form values', async () => {
    let finishDraft!: (value: { res: { ok: boolean } }) => void;
    const submittedTitles: unknown[] = [];
    h.submit.mockImplementationOnce(() => {
      submittedTitles.push(h.data.title);
      return new Promise(resolve => { finishDraft = resolve; });
    }).mockImplementationOnce(() => {
      submittedTitles.push(h.data.title);
      return Promise.resolve({ res: { ok: true } });
    });
    const view = render(<EventSaveController />);
    h.data = { ...h.data, title: 'Draft title' }; h.modified = true;
    view.rerender(<EventSaveController />);
    await advance(2000);
    expect(h.submit).toHaveBeenCalledOnce();
    h.data = { ...h.data, title: 'Final title' };
    view.rerender(<EventSaveController />);
    let published!: Promise<boolean>;
    await act(async () => { published = h.save.current!('publish'); await Promise.resolve(); });
    expect(h.submit).toHaveBeenCalledOnce();
    await act(async () => { finishDraft({ res: { ok: true } }); await published; });
    expect(submittedTitles).toEqual(['Draft title', 'Final title']);
    expect(h.submit.mock.calls[1][0].overrides).toMatchObject({ _status: 'published', reviewStatus: 'approved' });
  });

  it('blocks duplicate creation until the document route provides its new ID', async () => {
    h.document = { ...h.document, id: undefined, data: {} };
    const view = render(<EventSaveController />);
    h.data = { ...h.data, title: 'New draft' }; h.modified = true;
    view.rerender(<EventSaveController />);
    expect(await save('draft')).toBe(true);
    h.data = { ...h.data, title: 'Another edit' };
    view.rerender(<EventSaveController />);
    expect(await save('draft')).toBe(false);
    expect(h.submit).toHaveBeenCalledOnce();
    expect(h.submit.mock.calls[0][0].method).toBe('POST');
    h.document = { ...h.document, id: 9, data: { id: 9 } };
    view.rerender(<EventSaveController />);
    expect(await save('draft')).toBe(true);
    expect(h.submit.mock.calls[1][0]).toMatchObject({ method: 'PATCH', action: '/api/events/9?depth=0&draft=true&autosave=true' });
  });

  it('queues unpublish after autosave and removes the published document without draft mode', async () => {
    let finishDraft!: (value: { res: { ok: boolean } }) => void;
    h.submit.mockImplementationOnce(() => new Promise(resolve => { finishDraft = resolve; }));
    const view = render(<EventSaveController />);
    h.data = { ...h.data, title: 'Editing live event' }; h.modified = true;
    view.rerender(<EventSaveController />);
    await advance(2000);
    let unpublished!: Promise<boolean>;
    await act(async () => { unpublished = h.save.current!('unpublish'); await Promise.resolve(); });
    expect(h.submit).toHaveBeenCalledOnce();
    expect(h.fetch).not.toHaveBeenCalled();
    await act(async () => { finishDraft({ res: { ok: true } }); expect(await unpublished).toBe(true); });
    expect(h.submit).toHaveBeenCalledOnce();
    expect(h.fetch).toHaveBeenCalledWith('/api/events/7?depth=0&unpublishAllLocales=true', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _status: 'draft' }) });
    expect(h.document.setHasPublishedDoc).toHaveBeenCalledWith(false);
  });

  it('unpublishes with incomplete local edits without sending or clearing those edits', async () => {
    h.data = { ...h.data, title: '', description: '', _status: 'published' };
    h.modified = true;
    render(<EventSaveController />);
    expect(await save('unpublish')).toBe(true);
    expect(h.submit).not.toHaveBeenCalled();
    expect(h.setSubmitted).not.toHaveBeenCalled();
    expect(h.fetch.mock.calls[0][1].body).toBe(JSON.stringify({ _status: 'draft' }));
    expect(h.data.title).toBe('');
    expect(h.modified).toBe(true);
    expect(h.document.setHasPublishedDoc).toHaveBeenCalledWith(false);
  });

  it('exposes native field validation and blocks publication when required details are missing', async () => {
    h.data = { ...h.data, title: ' ' };
    render(<EventSaveController />);
    expect(await save('publish')).toBe(false);
    expect(h.submit).not.toHaveBeenCalled();
    expect(h.setSubmitted).toHaveBeenCalledWith(true);
    expect(h.dispatchFields).toHaveBeenCalledWith(expect.objectContaining({ type: 'ADD_SERVER_ERRORS', errors: expect.arrayContaining([expect.objectContaining({ path: 'title' })]) }));
    expect(h.setStep).toHaveBeenCalledWith(0);
  });

  it('does not turn an initially published document into a draft on mount', async () => {
    h.data = { ...h.data, _status: 'published', reviewStatus: 'approved' };
    h.modified = true;
    render(<EventSaveController />);
    await advance(10000);
    expect(h.submit).not.toHaveBeenCalled();
  });
});
