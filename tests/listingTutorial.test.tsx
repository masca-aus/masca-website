// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ListingTutorial, reviewQueueHref } from '@/components/admin/ListingTutorial';
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
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
  render(<ListingTutorial collection={collection} />);
  fireEvent.click(screen.getByRole('button', { name: 'Show tutorial' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('heading', { name: 'Public submissions need your review' })).toBeTruthy();
  expect(screen.getByText('Public form → To be reviewed → Check details → Publish')).toBeTruthy();
  const query = new URL(reviewQueueHref(collection), 'https://example.com').searchParams;
  expect(query.get('where[submittedForReview][equals]')).toBe('true');
  expect(query.get('where[_status][equals]')).toBe('draft');
});
it('previews editor steps without saving and restores the original section', async () => {
  const preview = vi.fn();
  render(<ListingTutorial collection="careers" editor currentStep={2} onPreviewStep={preview} />);
  fireEvent.click(screen.getByRole('button', { name: 'Show tutorial' }));
  await waitFor(() => expect(preview).toHaveBeenLastCalledWith(0));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(preview).toHaveBeenLastCalledWith(1));
  fireEvent.click(screen.getByRole('button', { name: 'Close tutorial' }));
  expect(preview).toHaveBeenLastCalledWith(2);
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
it('highlights the real creation link and only permits its explicit navigation action', async () => {
  const { TutorialSpotlight } = await import('@/components/admin/TutorialSpotlight');
  const navigate = vi.fn();
  const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 70, left: 30, width: 140, height: 40, bottom: 110, right: 170, x: 30, y: 70, toJSON: () => ({}) });
  render(<><a id="create-test" href="/admin/collections/careers/create">Create</a><TutorialSpotlight label="Careers" steps={[{title:'Create',body:'Start here',target:'#create-test',action:'create'}]} onClose={vi.fn()} onNavigate={navigate} /></>);
  fireEvent.click(await screen.findByRole('button', { name: 'Open creation form and continue tutorial' }));
  expect(navigate).toHaveBeenCalledWith(expect.stringContaining('/admin/collections/careers/create'), 'create');
  bounds.mockRestore();
});
it('keeps the guide hidden until smooth scrolling settles', async () => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  const anchor = document.createElement('a');
  anchor.href = '/admin/collections/careers/create';
  anchor.getBoundingClientRect = () => ({ top: 180, left: 20, width: 120, height: 40, bottom: 220, right: 140, x: 20, y: 180, toJSON() {} });
  document.body.appendChild(anchor);
  try {
    render(<ListingTutorial collection="careers" accountId={50} />);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' }));
    expect(dialog.getAttribute('data-fading')).toBe('true');
    await waitFor(() => expect(dialog.getAttribute('data-fading')).toBe('false'));
  } finally { anchor.remove(); }
});
