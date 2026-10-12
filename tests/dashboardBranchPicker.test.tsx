// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardBranchPicker } from '@/components/admin/DashboardBranchPicker';
afterEach(cleanup);

describe('dashboard branch picker', () => {
  it('only offers allowed branches and submits the selected scope through the existing GET form', () => {
    const { container } = render(<DashboardBranchPicker branches={['QLD', 'NSW']} value="all" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.queryByRole('option', { name: /Victoria/ })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'Queensland (QLD)' }));
    const form = container.querySelector('form')!;
    expect(new FormData(form).get('branch')).toBe('QLD');
    expect(form.getAttribute('action')).toBe('/admin');
    expect(form.getAttribute('method')).toBe('get');
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: 'Apply' }).getAttribute('type')).toBe('submit');
  });
  it('supports keyboard selection, cancellation and focus return', () => {
    const { container } = render(<DashboardBranchPicker branches={['National', 'QLD']} value="QLD" />);
    const trigger = screen.getByRole('combobox'); trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Queensland (QLD)' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(trigger, { key: 'Home' }); fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(new FormData(container.querySelector('form')!).get('branch')).toBe('all');
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger); fireEvent.keyDown(trigger, { key: 'End' }); fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(new FormData(container.querySelector('form')!).get('branch')).toBe('all');
  });
  it('closes on an outside click without applying a different selection', () => {
    render(<DashboardBranchPicker branches={['QLD']} value="QLD" />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('combobox').textContent).toContain('Queensland (QLD)');
  });
});

it('retains the Metrics view when applying a branch', () => {
  const { container } = render(<DashboardBranchPicker view="metrics" branches={['QLD']} value="all" />);
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', {name:'Queensland (QLD)'}));
  const data = new FormData(container.querySelector('form')!);
  expect(data.get('view')).toBe('metrics');
  expect(data.get('branch')).toBe('QLD');
});


it('applies the selected branch through client navigation without refreshing the page', async () => {
  const { AdminNavigationContext } = await import('@/components/admin/AdminNavigationContext');
  const { createAdminNavigationMemory } = await import('@/components/admin/adminNavigation');
  const navigate = vi.fn();
  const { container } = render(<AdminNavigationContext.Provider value={{ memory: createAdminNavigationMemory(), navigate }}>
    <DashboardBranchPicker view="metrics" branches={['QLD']} value="all" />
  </AdminNavigationContext.Provider>);
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', { name: 'Queensland (QLD)' }));
  expect(fireEvent.submit(container.querySelector('form')!)).toBe(false);
  expect(navigate).toHaveBeenCalledWith('/admin?branch=QLD&view=metrics', { scroll: false });
});
