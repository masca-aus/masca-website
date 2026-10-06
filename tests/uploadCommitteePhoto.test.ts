// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { uploadCommitteePhoto } from '@/utils/uploadCommitteePhoto';
vi.mock('@/utils/imageCompression', () => ({ compressUploadImage: vi.fn(async (file: File) => file) }));
afterEach(() => vi.unstubAllGlobals());
it('uploads the image with session credentials and returns media without publishing a member', async () => {
  const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ doc: { id: 7, url: '/photo.jpg' } }) });
  vi.stubGlobal('fetch', request);
  const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
  expect(await uploadCommitteePhoto(file, '/api')).toEqual({ id: 7, url: '/photo.jpg' });
  expect(request).toHaveBeenCalledTimes(1);
  const [url, options] = request.mock.calls[0];
  expect(url).toBe('/api/media');
  expect(options.credentials).toBe('same-origin');
  expect(options.body.get('file')).toBeInstanceOf(File);
});
it('reports failed uploads instead of returning a broken media relationship', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => ({}) }));
  await expect(uploadCommitteePhoto(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }), '/api')).rejects.toThrow('too large');
});
