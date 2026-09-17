// @vitest-environment jsdom
import { useState, type Dispatch, type Context, type SetStateAction } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEditorFooter, EventEditorHeader } from '@/components/admin/EventEditorFields';
import { firstIncompleteEventStep } from '@/features/events/eventEditor';

const h = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  published: false,
  dateValidation: {} as Record<string, string>,
  save: vi.fn(), setSubmitted: vi.fn(), dispatchFields: vi.fn(),
  context: null as null | Context<{ step: number; setStep: Dispatch<SetStateAction<number>>; error: string; setError: Dispatch<SetStateAction<string>>; saveState: string; dateSelectionValidationRef: { current: () => Record<string, string> }; save: { current: (intent: string) => Promise<boolean> } } | null>,
}));
vi.mock('@payloadcms/ui', () => ({
  useConfig: () => ({ config: { routes: { api: '/api' } } }),
  useDocumentInfo: () => ({ hasPublishedDoc: h.published }),
  useFormFields: (selector: (state: [Record<string, { value: unknown }>]) => unknown) => selector([Object.fromEntries(Object.entries(h.data).map(([key, value]) => [key, { value }]))]),
  useForm: () => ({ getData: () => h.data, setSubmitted: h.setSubmitted, dispatchFields: h.dispatchFields, disabled: false }),
}));
vi.mock('@/components/admin/EventEditorView', async () => {
  const { createContext, useContext } = await import('react');
  h.context = createContext<Parameters<NonNullable<typeof h.context>['Provider']>[0]['value']>(null);
  return { useEventEditor: () => useContext(h.context!) };
});

function Editor({ initialStep = 0 }: { initialStep?: number }) {
  const [step, setStep] = useState(initialStep);
  const [error, setError] = useState('');
  const Provider = h.context!.Provider;
  return <Provider value={{ step, setStep, error, setError, saveState: 'idle', save: { current: h.save }, dateSelectionValidationRef: { current: () => h.dateValidation } }}><EventEditorHeader /><EventEditorFooter /></Provider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.published = false;
  h.dateValidation = {};
  h.data = { title: 'Student dinner', organisation: 'MASCA QLD', description: 'A welcome dinner', startDate: '2026-10-01T10:00:00Z', venue: 'Community Hall', state: 'QLD', contactName: 'Private Person', contactEmail: 'private@example.com', internalNotes: 'Private committee note', poster: 7 };
  h.save.mockResolvedValue(true);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 7, url: '/test-poster.png', alt: 'Dinner poster', filename: 'dinner.png' }) }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function renderOverview() {
  await act(async () => { render(<Editor initialStep={4} />); });
}

describe('event editor navigation and preview', () => {
  it('does not advance or jump past a date range missing its end', () => {
    h.dateValidation = { endDate: 'Choose an end date, or select One day.' };
    render(<Editor initialStep={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Date and location');
    expect(h.dispatchFields).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.arrayContaining([expect.objectContaining({ path: 'endDate' })]) }));
    fireEvent.click(screen.getByRole('button', { name: 'View steps' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview and publish' }));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Date and location');
  });

  it('keeps step navigation tucked away and closes it after choosing a section', () => {
    render(<Editor initialStep={1} />);
    const toggle = screen.getByRole('button', { name: 'View steps' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('navigation', { name: 'Event steps' })).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Basics' }));
    expect(screen.queryByRole('navigation', { name: 'Event steps' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Basics', level: 2 }));
    expect(h.save).not.toHaveBeenCalled();
  });

  it('closes the step list with Escape and returns focus to its trigger', () => {
    render(<Editor />);
    const toggle = screen.getByRole('button', { name: 'View steps' });
    fireEvent.click(toggle);
    const basics = screen.getByRole('button', { name: 'Basics' });
    basics.focus();
    fireEvent.keyDown(basics, { key: 'Escape' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('keeps incomplete basics visible and exposes field errors on Continue', () => {
    h.data = { ...h.data, title: ' ', description: '' };
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Basics');
    expect(screen.getByRole('alert').textContent).toContain('highlighted details');
    expect(h.setSubmitted).toHaveBeenCalledWith(true);
    expect(h.dispatchFields).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.arrayContaining([expect.objectContaining({ path: 'title' }), expect.objectContaining({ path: 'description' })]) }));
  });

  it('validates intermediate sections before jumping forward', () => {
    h.data = { ...h.data, startDate: '', venue: '' };
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'View steps' }));
    fireEvent.click(screen.getByRole('button', { name: /Preview and publish/ }));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Date and location');
    expect(h.setSubmitted).toHaveBeenCalledWith(true);
    expect(h.dispatchFields).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.arrayContaining([expect.objectContaining({ path: 'startDate' }), expect.objectContaining({ path: 'venue' })]) }));
  });

  it('preserves entered values when moving backwards and focuses the new heading', () => {
    render(<Editor initialStep={1} />);
    const original = { ...h.data };
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(h.data).toEqual(original);
    expect(h.dispatchFields).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Basics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Date and location' }));
  });

  it('shows private contact information separately from the public preview', async () => {
    await renderOverview();
    const card = screen.getByRole('article', { name: 'Public event preview' });
    expect(within(card).getByRole('heading', { name: 'Student dinner' })).toBeTruthy();
    expect(within(card).getByRole('img', { name: 'Dinner poster' }).getAttribute('src')).toBe('/test-poster.png');
    expect(card.textContent).not.toContain('Private Person');
    expect(card.textContent).not.toContain('private@example.com');
    expect(card.textContent).not.toContain('Private committee note');
    const privateSection = screen.getByRole('heading', { name: 'Contact details · committee only' }).closest('section');
    expect(privateSection?.textContent).toContain('private@example.com');
    expect(privateSection?.textContent).toContain('Private committee note');
  });

  it('opens the selected section from the overview Edit action', async () => {
    await renderOverview();
    fireEvent.click(screen.getByRole('button', { name: 'Edit contact details · committee only' }));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Contact details');
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }));
    expect(h.data.contactEmail).toBe('private@example.com');
  });

  it('shows the overview for a complete existing published event', async () => {
    h.published = true;
    await act(async () => { render(<Editor initialStep={firstIncompleteEventStep(h.data)} />); });
    expect(screen.getByRole('heading', { level: 2, name: 'Event overview' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Publish changes' })).toBeTruthy();
    expect(screen.getByRole('article', { name: 'Public event preview' })).toBeTruthy();
  });

  it('dispatches separate exit and publish intents from the final step', async () => {
    await renderOverview();
    fireEvent.click(screen.getByRole('button', { name: 'Save and exit' }));
    expect(h.save).toHaveBeenLastCalledWith('exit');
    fireEvent.click(screen.getByRole('button', { name: 'Publish event' }));
    expect(h.save).toHaveBeenLastCalledWith('publish');
  });
});
