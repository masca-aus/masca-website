// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OrganisationSearchField } from '@/components/admin/OrganisationSearchField';

const { setValue } = vi.hoisted(() => ({ setValue: vi.fn() }));
vi.mock('@payloadcms/ui', () => ({ useField: () => ({ value: '', setValue, disabled: false, showError: false }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
const props = { field: { name: 'organisation', type: 'text', required: true }, path: 'organisation' } as React.ComponentProps<typeof OrganisationSearchField>;

describe('organisation search', () => {
 it('searches the directory and accepts a result with the keyboard', async () => {
   vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ docs: [{ id: 1, name: 'Malaysians of Melbourne University', abbreviation: 'MoMU', university: 'University of Melbourne', state: 'VIC' }] }) })));
   render(<OrganisationSearchField {...props} />);
   const input = screen.getByRole('combobox');
   fireEvent.focus(input);
   fireEvent.change(input, { target: { value: 'MoMU' } });
   await screen.findByRole('option', { name: /Malaysians of Melbourne University/ });
   fireEvent.keyDown(input, { key: 'ArrowDown' });
   fireEvent.keyDown(input, { key: 'Enter' });
   expect(setValue).toHaveBeenLastCalledWith('Malaysians of Melbourne University');
   expect(input.getAttribute('aria-expanded')).toBe('false');
 });
 it('keeps manual entry usable when the directory fails', async () => {
   vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
   render(<OrganisationSearchField {...props} />);
   const input = screen.getByRole('combobox');
   fireEvent.focus(input);
   fireEvent.change(input, { target: { value: 'New student club' } });
   await screen.findByText(/Directory unavailable/);
   expect(setValue).toHaveBeenLastCalledWith('New student club');
 });
 it('does not load search results for a read-only record', async () => {
   const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
   render(<OrganisationSearchField {...props} readOnly />);
   expect((screen.getByRole('combobox') as HTMLInputElement).disabled).toBe(true);
   await waitFor(() => expect(fetcher).not.toHaveBeenCalled());
 });
});
