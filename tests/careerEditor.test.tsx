// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CareerEditorView, CareerEditorHeader, CareerEditorFooter } from '@/components/admin/CareerEditor';
import { careerStepErrors } from '@/features/careers/careerEditor';
import type { DocumentViewClientProps } from 'payload';
const h = vi.hoisted(() => ({ data: {} as Record<string, unknown>, errors: vi.fn(), draft: vi.fn(), publish: vi.fn(), submitted: false, firstError: '' }));
vi.mock('@payloadcms/ui', () => ({
  DefaultEditView: () => <><CareerEditorHeader /><CareerEditorFooter /></>,
  SaveDraftButton: () => <button onClick={h.draft}>Save draft</button>,
  PublishButton: () => <button onClick={h.publish}>Publish opportunity</button>,
  useDocumentInfo: () => ({ id: undefined }), useFormProcessing: () => false,
  useFormModified: () => true, useFormSubmitted: () => h.submitted,
  useForm: () => ({ getData: () => h.data, dispatchFields: h.errors, setSubmitted: () => {} }),
  useFormFields: (select: (state: [Record<string, {value: unknown; valid: boolean}>]) => unknown) => select([Object.fromEntries(Object.entries(h.data).map(([key, value]) => [key, { value, valid: key !== h.firstError }]))]),
}));
const editor = () => <CareerEditorView {...({} as DocumentViewClientProps)} />;
beforeEach(() => { vi.clearAllMocks(); h.submitted = false; h.firstError = ''; h.data = { title: 'Engineer', company: 'Example', applyUrl: 'https://example.com/jobs' }; });
afterEach(cleanup);
it('allows an incomplete draft at every step without publishing', () => {
  h.data = {}; render(editor());
  for (let i = 0; i < 4; i++) {
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    if (i < 3) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  }
  expect(h.draft).toHaveBeenCalledTimes(4); expect(h.publish).not.toHaveBeenCalled();
});
it('blocks invalid publication and opens the field step', () => {
  h.data.applyUrl = 'javascript:alert(1)'; render(editor());
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Publish opportunity' }));
  expect(screen.getByRole('heading', { name: 'Application and details' })).toBeTruthy();
  expect(h.errors).toHaveBeenCalled(); expect(h.publish).not.toHaveBeenCalled();
});
it('publishes valid data with a rolling deadline using the native control', () => {
  render(editor());
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByText('Rolling applications')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Publish opportunity' }));
  expect(h.publish).toHaveBeenCalledOnce();
});
it('returns to a server-invalid field after publication', () => {
  const view = render(editor());
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Publish opportunity' }));
  h.firstError = 'company'; h.submitted = true; view.rerender(editor());
  expect(screen.getByRole('heading', { name: 'Role and company' })).toBeTruthy();
});
it('accepts full web links and email applications but rejects incomplete URLs', () => {
  for (const applyUrl of ['https://example.com/jobs', 'http://example.com', 'jobs@example.com', 'mailto:jobs@example.com']) expect(careerStepErrors({ applyUrl }, 2)).toEqual({});
  for (const applyUrl of ['', 'example.com', 'ftp://example.com', 'javascript:alert(1)', 'mailto:invalid']) expect(careerStepErrors({ applyUrl }, 2)).toHaveProperty('applyUrl');
});
it('closes step navigation with Escape and restores focus', () => {
  render(editor());
  const toggle = screen.getByRole('button', { name: 'View steps' });
  fireEvent.click(toggle);
  fireEvent.keyDown(screen.getByRole('navigation', { name: 'Career steps' }), { key: 'Escape' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(toggle);
});
it('routes missing identity fields back to role and company before publishing', () => {
  h.data.company = ' '; render(editor());
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Publish opportunity' }));
  expect(screen.getByRole('heading', { name: 'Role and company' })).toBeTruthy();
  expect(h.publish).not.toHaveBeenCalled();
});
it('reviews readable labels and the public listing details', () => {
  Object.assign(h.data, { type: 'internship', workMode: 'remote', international: 'unsure', studyLevels: ['any'], companyWebsite: 'https://example.com', logoUrl: 'https://example.com/logo.png', featured: true, tags: 'Engineering, Technology', added: '2026-09-17' });
  render(editor());
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByText('Internship')).toBeTruthy();
  expect(screen.getByText('Remote')).toBeTruthy();
  expect(screen.getByText('Study levels: Any year level')).toBeTruthy();
  expect(screen.getByText('International students: Check working rights')).toBeTruthy();
  for (const text of ['Company website: https://example.com', 'Logo URL: https://example.com/logo.png', 'Featured: Yes', 'Tags: Engineering, Technology', 'Listed date: 2026-09-17']) expect(screen.getByText(text)).toBeTruthy();
});
it('validates optional URLs and actual calendar dates consistently with publication', () => {
  expect(careerStepErrors({ ...h.data, companyWebsite: 'http://localhost', logoUrl: 'http://example.com/logo.png' }, 0)).toEqual(expect.objectContaining({ companyWebsite: expect.any(String), logoUrl: expect.any(String) }));
  expect(careerStepErrors({ ...h.data, applyUrl: 'https://user:pass@example.com', closes: '2026-02-30', added: 'not-a-date' }, 2)).toEqual(expect.objectContaining({ applyUrl: expect.any(String), closes: expect.any(String), added: expect.any(String) }));
});
