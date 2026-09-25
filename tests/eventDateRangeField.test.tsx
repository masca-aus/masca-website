// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { DateFieldClientProps } from 'payload';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventDateRangeField } from '@/components/admin/EventDateRangeField';
import { eventDate, eventTime } from '@/features/events/eventDates';

const h = vi.hoisted(() => ({
  data: {} as Record<string, string | null>, disabled: false,
  validation: { current: null as null | (() => Record<string, string>) },
}));
vi.mock('@payloadcms/ui', async () => {
  const { useState } = await import('react');
  return {
    FieldError: () => null,
    useField: ({ path }: { path: string }) => {
      const [value, setValue] = useState(h.data[path]);
      return { value, disabled: h.disabled, showError: false, setValue: (next: string | null) => { h.data[path] = next; setValue(next); } };
    },
  };
});
vi.mock('@/components/admin/EventEditorView', () => ({ useEventEditor: () => ({ dateSelectionValidationRef: h.validation }) }));
beforeEach(() => {
  h.data = { startDate: new Date(2026, 8, 20, 18, 30).toISOString(), endDate: null };
  h.disabled = false;
  h.validation.current = null;
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const open = () => render(<EventDateRangeField {...({ field: { type: 'date', name: 'startDate', admin: {} }, path: 'startDate' } as DateFieldClientProps)} />);

describe('single-day and range selection integrated with Payload fields', () => {
  it('supports arrow-key navigation and Enter selection', async () => {
    await act(async () => { open(); });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Change dates/ })));
    await screen.findAllByRole('option');
    const day = screen.getByRole('option', { name: /September 20th, 2026/ });
    day.focus();
    await act(async () => fireEvent.keyDown(day, { key: 'ArrowRight' }));
    expect(document.activeElement?.getAttribute('aria-label')).toContain('September 21st, 2026');
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(eventDate(h.data.startDate)?.getDate()).toBe(21);
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('option')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Change dates/ }));
  });

  it('selects one day without creating an end date and preserves the time', async () => {
    await act(async () => { open(); });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Change dates/ })));
    await screen.findAllByRole('option');
    await act(async () => fireEvent.click(screen.getByRole('option', { name: /September 21st, 2026/ })));
    expect(eventDate(h.data.startDate)?.getDate()).toBe(21);
    expect(eventTime(eventDate(h.data.startDate))).toBe('18:30');
    expect(h.data.endDate).toBeNull();
    expect(h.validation.current?.()).toEqual({});
  });
  it('requires a second day in range mode and stores both dates after selection', async () => {
    await act(async () => { open(); });
    await act(async () => fireEvent.click(screen.getByRole('radio', { name: 'Date range' })));
    await screen.findAllByRole('option');
    expect(h.validation.current?.()).toHaveProperty('endDate');
    await act(async () => fireEvent.click(screen.getByRole('option', { name: /September 24th, 2026/ })));
    expect(eventDate(h.data.startDate)?.getDate()).toBe(20);
    expect(eventDate(h.data.endDate)?.getDate()).toBe(24);
    expect(eventTime(eventDate(h.data.startDate))).toBe('18:30');
    expect(eventTime(eventDate(h.data.endDate))).toBe('17:00');
    expect(h.validation.current?.()).toEqual({});
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Done' })));
    expect(screen.queryByRole('option')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Change dates/ }));
  });
  it('resumes an existing range and lets the committee explicitly switch to one day', async () => {
    h.data.endDate = new Date(2026, 8, 22, 20).toISOString();
    await act(async () => { open(); });
    expect((screen.getByRole('radio', { name: 'Date range' }) as HTMLInputElement).checked).toBe(true);
    await act(async () => fireEvent.click(screen.getByRole('radio', { name: 'One day' })));
    expect(h.data.endDate).toBeNull();
    expect(eventTime(eventDate(h.data.startDate))).toBe('18:30');
  });
  it('supports an optional end time on the same day and preserves it when changing day', async () => {
    await act(async () => { open(); });
    await act(async () => fireEvent.click(screen.getByRole('checkbox', { name: /Add an end time/ })));
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '21:45' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Change dates/ })));
    await screen.findAllByRole('option');
    await act(async () => fireEvent.click(screen.getByRole('option', { name: /September 21st, 2026/ })));
    expect(eventDate(h.data.endDate)?.getDate()).toBe(21);
    expect(eventTime(eventDate(h.data.endDate))).toBe('21:45');
    await act(async () => fireEvent.click(screen.getByRole('checkbox', { name: /Add an end time/ })));
    expect(h.data.endDate).toBeNull();
  });
  it('opens an empty event without silently writing a date', async () => {
    h.data.startDate = null;
    await act(async () => { open(); });
    expect((await screen.findAllByRole('option')).length).toBeGreaterThan(27);
    expect(h.data).toEqual({ startDate: null, endDate: null });
  });
});
