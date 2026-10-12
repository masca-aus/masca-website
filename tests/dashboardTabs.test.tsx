// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DashboardTabs } from '@/components/admin/DashboardTabs';
import { DashboardBranchPicker } from '@/components/admin/DashboardBranchPicker';

beforeEach(() => window.history.replaceState(null, '', '/admin?branch=QLD'));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function dashboard(initialView: 'workspace' | 'metrics' = 'workspace') {
  return render(<DashboardTabs initialView={initialView} branch="QLD"
    workspace={<input aria-label="Workspace note" defaultValue="" />}
    metrics={<details><summary>Daily values</summary><p>73 visitors</p></details>}>
    <DashboardBranchPicker branches={['QLD', 'NSW']} value="QLD" />
  </DashboardTabs>);
}
it('switches immediately in place, retaining panel state and applied branch', () => {
  const { container } = dashboard();
  const push = vi.spyOn(window.history, 'pushState');
  const workspacePanel = screen.getByRole('tabpanel', { name: 'Workspace' });
  fireEvent.change(screen.getByLabelText('Workspace note'), { target: { value: 'Keep this' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Metrics' }));
  expect(screen.getByRole('tabpanel', { name: 'Metrics' }).hidden).toBe(false);
  expect(workspacePanel.hidden).toBe(true);
  expect(window.location.search).toBe('?branch=QLD&view=metrics');
  expect(new FormData(container.querySelector('form')!).get('view')).toBe('metrics');
  const details = container.querySelector('details')!;
  fireEvent.click(screen.getByText('Daily values'));
  expect(details.open).toBe(true);
  fireEvent.click(screen.getByRole('tab', { name: 'Workspace' }));
  expect(screen.getByRole('tabpanel', { name: 'Workspace' })).toBe(workspacePanel);
  expect((screen.getByLabelText('Workspace note') as HTMLInputElement).value).toBe('Keep this');
  expect(window.location.search).toBe('?branch=QLD');
  expect(new FormData(container.querySelector('form')!).get('view')).toBe('workspace');
  fireEvent.click(screen.getByRole('tab', { name: 'Metrics' }));
  expect(details.open).toBe(true);
  fireEvent.click(screen.getByRole('tab', { name: 'Metrics' }));
  expect(push).toHaveBeenCalledTimes(3);
});
it('supports keyboard navigation and one tab stop', () => {
  dashboard();
  const workspace = screen.getByRole('tab', { name: 'Workspace' });
  const metrics = screen.getByRole('tab', { name: 'Metrics' });
  workspace.focus();
  fireEvent.keyDown(workspace, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(metrics);
  expect(metrics.tabIndex).toBe(0);
  expect(workspace.tabIndex).toBe(-1);
  fireEvent.keyDown(metrics, { key: 'Home' });
  expect(document.activeElement).toBe(workspace);
  fireEvent.keyDown(workspace, { key: 'End' });
  expect(document.activeElement).toBe(metrics);
  fireEvent.keyDown(metrics, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(workspace);
});
it('restores the selected panel on history navigation and supports direct Metrics entry', () => {
  window.history.replaceState(null, '', '/admin?branch=QLD&view=metrics');
  dashboard('metrics');
  expect(screen.getByRole('tab', { name: 'Metrics' }).getAttribute('aria-selected')).toBe('true');
  act(() => {
    window.history.replaceState(null, '', '/admin?branch=QLD');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(screen.getByRole('tab', { name: 'Workspace' }).getAttribute('aria-selected')).toBe('true');
  act(() => {
    window.history.replaceState(null, '', '/admin?branch=QLD&view=metrics');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(screen.getByRole('tabpanel', { name: 'Metrics' }).hidden).toBe(false);
});
