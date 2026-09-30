// @vitest-environment jsdom
import type { ComponentProps } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ContentPermissionsField } from '../components/admin/ContentPermissionsField';
const h = vi.hoisted(() => ({ setValue: vi.fn(), role: 'editor', disabled: false }));
vi.mock('@payloadcms/ui', () => ({
  useAuth: () => ({ user: { email: 'test@masca.org.au', status: 'active', role: h.role } }),
  useField: () => ({ value: { events: { view: true, edit: true, scopes: ['National'] } }, setValue: h.setValue, disabled: h.disabled }),
}));
beforeEach(() => { h.role = 'editor'; h.disabled = false; h.setValue.mockClear(); });
afterEach(cleanup);
it('prevents an editor from changing section and team permissions on their account page', () => {
  render(<ContentPermissionsField {...({ path: 'permissions' } as ComponentProps<typeof ContentPermissionsField>)} />);
  for (const input of screen.getAllByRole('checkbox')) expect(input.closest('fieldset')?.matches(':disabled')).toBe(true);
  fireEvent.click(screen.getByLabelText('Can edit Events'));
  expect(h.setValue).not.toHaveBeenCalled();
});
it('honours the field read-only setting even for an administrator', () => {
  h.role = 'administrator';
  render(<ContentPermissionsField {...({ path: 'permissions', readOnly: true } as ComponentProps<typeof ContentPermissionsField>)} />);
  fireEvent.click(screen.getByLabelText('Can edit Events'));
  expect(h.setValue).not.toHaveBeenCalled();
});
it('allows administrators to edit permissions on an editable form', () => {
  h.role = 'administrator';
  render(<ContentPermissionsField {...({ path: 'permissions' } as ComponentProps<typeof ContentPermissionsField>)} />);
  fireEvent.click(screen.getByLabelText('Can edit Events'));
  expect(h.setValue).toHaveBeenCalled();
});
