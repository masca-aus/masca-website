// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ListingTutorial, reviewQueueHref } from '@/components/admin/ListingTutorial';
beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);
it('shows first-visit guidance per person and collection and remembers dismissal', async () => {
  const view = render(<ListingTutorial collection="careers" accountId={1} />);
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: 'Skip tutorial' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  view.unmount();
  const again = render(<ListingTutorial collection="careers" accountId={1} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show tutorial' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  again.unmount();
  render(<ListingTutorial collection="events" accountId={1} />);
  expect(await screen.findByRole('dialog')).toBeTruthy();
});
it.each(['careers', 'events'] as const)('explains the public review flow for %s and links the queue', collection => {
  render(<ListingTutorial collection={collection} editor />);
  fireEvent.click(screen.getByRole('button', { name: 'Show tutorial' }));
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('heading', { name: 'Public submissions need your review' })).toBeTruthy();
  expect(screen.getByRole('list', { name: 'Submission review flow' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /View public/ }).getAttribute('href')).toBe(`/submit/${collection === 'events' ? 'event' : 'career'}`);
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('heading', { name: collection === 'careers' ? 'Review and publish' : 'Preview and publish' })).toBeTruthy();
  const query = new URL(reviewQueueHref(collection), 'https://example.com').searchParams;
  expect(query.get('where[submittedForReview][equals]')).toBe('true');
  expect(query.get('where[_status][equals]')).toBe('draft');
});
it('does not submit the surrounding editor and restores focus when closed', async () => {
  const submit = vi.fn(e => e.preventDefault());
  render(<form onSubmit={submit}><ListingTutorial collection="careers" editor /></form>);
  const trigger = screen.getByRole('button', { name: 'Show tutorial' });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(document.activeElement).toBe(trigger);
  expect(submit).not.toHaveBeenCalled();
});
