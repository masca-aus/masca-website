// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { compressUploadImage, MAX_UPLOAD_IMAGE_BYTES } from '@/utils/imageCompression';
afterEach(() => vi.restoreAllMocks());
it('keeps files below the safe request budget unchanged', async () => {
  const file = new File(['small'], 'portrait.jpg', { type: 'image/jpeg' });
  expect(await compressUploadImage(file)).toBe(file);
  expect(MAX_UPLOAD_IMAGE_BYTES).toBeLessThan(4_500_000);
});
it('compresses a large photo and keeps the original dimensions initially', async () => {
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 3000, height: 4000, close }));
  const draw = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: draw } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback, type, quality) {
    callback(new Blob([new Uint8Array(quality! > .9 ? 4_700_000 : 4_000_000)], { type }));
  });
  const file = new File([new Uint8Array(4_700_000)], 'portrait.JPG', { type: 'image/jpeg' });
  const result = await compressUploadImage(file);
  expect(result.size).toBeLessThanOrEqual(MAX_UPLOAD_IMAGE_BYTES);
  expect(result.type).toBe('image/jpeg');
  expect(result.name).toBe('portrait.JPG');
  expect(draw).toHaveBeenCalledWith(expect.anything(), 0, 0, 3000, 4000);
  expect(close).toHaveBeenCalled();
});
it('does not silently flatten oversized animated or vector images', async () => {
  for (const type of ['image/gif', 'image/svg+xml', 'image/webp']) {
    await expect(compressUploadImage(new File([new Uint8Array(4_700_000)], 'image', { type }))).rejects.toThrow('JPEG or PNG');
  }
});
it('reports decode failures without submitting the original oversized file', async () => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad image')));
  await expect(compressUploadImage(new File([new Uint8Array(4_700_000)], 'bad.jpg', { type: 'image/jpeg' }))).rejects.toThrow();
});
