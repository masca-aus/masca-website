// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { UploadFieldClientProps } from 'payload';
import { CommitteePhotoField } from '@/components/admin/CommitteePhotoField';
const h = vi.hoisted(() => ({ value: null as unknown, setValue: vi.fn(), processing: vi.fn(), upload: vi.fn(), create: true }));
vi.mock('@/utils/uploadCommitteePhoto', () => ({ uploadCommitteePhoto: h.upload }));
vi.mock('@payloadcms/ui', () => ({ useField: () => ({ value: h.value, setValue: h.setValue, disabled: false }), useForm: () => ({ setProcessing: h.processing }), useConfig: () => ({ config: { routes: { api: '/api' } } }), useAuth: () => ({ permissions: { collections: { media: { create: h.create } } } }) }));
const props = { path: 'portrait', field: { name: 'portrait', relationTo: 'media', admin: { className: 'masca-committee-step masca-committee-step-2' } } } as UploadFieldClientProps;
beforeEach(() => { vi.clearAllMocks(); h.value = null; h.create = true; vi.stubGlobal('fetch', vi.fn()); vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview'); vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('uploads inline and sets the relationship only after success', async () => {
  let finish!: (photo: unknown) => void;
  h.upload.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { container } = render(<CommitteePhotoField {...props} />);
  expect(container.querySelector('.masca-committee-step-2')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Choose portrait file'), { target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] } });
  expect(h.processing).toHaveBeenCalledWith(true);
  expect(h.setValue).not.toHaveBeenCalled();
  await act(async () => finish({ id: 7, url: '/photo.jpg' }));
  expect(h.setValue).toHaveBeenCalledExactlyOnceWith(7);
  expect(screen.getByRole('status').textContent).toContain('Save the member');
  expect(h.processing).toHaveBeenLastCalledWith(false);
});
it('keeps the existing portrait when replacing fails', async () => {
  h.value = { id: 3, url: '/old.jpg' }; vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => h.value } as Response);
  h.upload.mockRejectedValue(new Error('Please retry.'));
  render(<CommitteePhotoField {...props} />);
  fireEvent.change(screen.getByLabelText('Choose portrait file'), { target: { files: [new File(['photo'], 'photo.jpg')] } });
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Please retry.'));
  expect(h.setValue).not.toHaveBeenCalled();
  expect(screen.getByAltText('Portrait preview').getAttribute('src')).toBe('/old.jpg');
});
it('removes only the relationship and makes no delete request', () => {
  h.value = { id: 3, url: '/old.jpg' }; vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => h.value } as Response);
  render(<CommitteePhotoField {...props} />);
  fireEvent.click(screen.getByRole('button', { name: /^Remove$/ }));
  expect(h.setValue).toHaveBeenCalledWith(null);
  expect(vi.mocked(fetch).mock.calls.every(([, options]) => options?.method !== 'DELETE')).toBe(true);
});
it('honours read-only fields and media create permission', () => {
  h.create = false;
  render(<CommitteePhotoField {...props} readOnly />);
  expect(screen.queryByRole('button', { name: 'Upload photo' })).toBeNull();
  expect((screen.getByRole('button', { name: 'Choose existing' }) as HTMLButtonElement).disabled).toBe(true);
});
