// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CommitteeEditorView, CommitteeEditorHeader, CommitteeEditorFooter } from '@/components/admin/CommitteeEditor';
import type { DocumentViewClientProps } from 'payload';
const h = vi.hoisted(() => ({ data: {} as Record<string, unknown>, errors: vi.fn(), save: vi.fn(), submitted: false, firstError: '' }));
vi.mock('@/components/admin/useEventPoster', () => ({ useMediaPreview: () => null }));
vi.mock('@payloadcms/ui', () => ({
  DefaultEditView: () => <><CommitteeEditorHeader /><CommitteeEditorFooter /></>,
  SaveButton: () => <button onClick={h.save}>Save member</button>,
  useDocumentInfo: () => ({ id: undefined }), useFormProcessing: () => false,
  useFormModified: () => true, useFormSubmitted: () => h.submitted,
  useForm: () => ({ getData: () => h.data, dispatchFields: h.errors, setSubmitted: () => {} }),
  useFormFields: (select: (state: [Record<string, {value: unknown; valid: boolean}>]) => unknown) => select([Object.fromEntries(Object.entries(h.data).map(([key, value]) => [key, { value, valid: key !== h.firstError }]))]),
}));
const editor = () => <CommitteeEditorView {...({} as DocumentViewClientProps)} />;
beforeEach(() => { vi.clearAllMocks(); h.submitted = false; h.firstError = ''; h.data = { name: 'Aisha', role: 'President', department: 'unassigned', year: '2026/2027', portrait: 3 }; });
afterEach(cleanup);
it('navigates without saving and offers the native save only after review', () => {
  render(editor());
  expect(screen.queryByRole('button', { name: 'Save member' })).toBeNull();
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('heading', { name: 'Review and save' })).toBeTruthy();
  expect(h.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Save member' }));
  expect(h.save).toHaveBeenCalledTimes(1);
});
it('blocks skipping incomplete steps and keeps the entered data', () => {
  h.data.year = '2026';
  render(editor());
  fireEvent.click(screen.getByRole('button', { name: 'View steps' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review and save' }));
  expect(screen.getByRole('heading', { name: 'Role and term' })).toBeTruthy();
  expect(h.errors).toHaveBeenCalled();
  expect(h.data.name).toBe('Aisha');
  expect(h.save).not.toHaveBeenCalled();
});
it('does not jump away while correcting a previously invalid field', () => {
  h.submitted = true; h.firstError = 'portrait';
  render(editor());
  expect(screen.getByRole('heading', { name: 'Identity' })).toBeTruthy();
});
it('reveals a server field error after attempting save', () => {
  const view = render(editor());
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save member' }));
  h.submitted = true; h.firstError = 'year';
  view.rerender(editor());
  expect(screen.getByRole('heading', { name: 'Role and term' })).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toContain('highlighted');
});
it('closes step navigation with Escape and restores focus', () => {
  render(editor());
  const toggle = screen.getByRole('button', { name: 'View steps' });
  fireEvent.click(toggle);
  fireEvent.keyDown(screen.getByRole('navigation', { name: 'Committee steps' }), { key: 'Escape' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(toggle);
});
