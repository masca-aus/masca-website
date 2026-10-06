// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PortraitAdjuster } from '@/components/admin/PortraitAdjuster';
import { exportPortrait } from '@/utils/portraitCrop';
vi.mock('@/utils/portraitCrop', async original => ({ ...await original<typeof import('@/utils/portraitCrop')>(), exportPortrait: vi.fn() }));
beforeEach(() => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 2000, height: 3000, close: vi.fn() }));
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:original'); vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('applies zoom and keyboard alignment, and reset restores centred framing', async () => {
  const original = new File(['image'], 'portrait.jpg', { type: 'image/jpeg' });
  const cropped = new File(['crop'], 'portrait-portrait.jpg', { type: 'image/jpeg' });
  vi.mocked(exportPortrait).mockResolvedValue(cropped); const apply = vi.fn().mockResolvedValue(true); const close = vi.fn();
  render(<PortraitAdjuster source={original} onApply={apply} onClose={close} />);
  await screen.findByRole('slider', { name: 'Zoom' });
  fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });
  fireEvent.keyDown(screen.getByRole('group'), { key: 'ArrowRight' });
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply photo' }));
  await waitFor(() => expect(apply).toHaveBeenCalledWith(cropped, original, { zoom: 1, x: 0, y: 0 }));
  expect(exportPortrait).toHaveBeenCalledWith(original, 1, 0, 0);
  expect(close).toHaveBeenCalled();
});
it('keeps the adjustment open when saving fails', async () => {
  vi.mocked(exportPortrait).mockResolvedValue(new File(['crop'], 'crop.jpg'));
  const close = vi.fn(); render(<PortraitAdjuster source={new File(['x'], 'photo.jpg', { type: 'image/jpeg' })} onApply={async () => false} onClose={close} />);
  await screen.findByRole('slider');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Apply photo' })));
  expect(screen.getByRole('alert').textContent).toContain('could not be saved');
  expect(close).not.toHaveBeenCalled();
});
it('reopens with the previous framing', async () => {
  render(<PortraitAdjuster source={new File(['x'], 'photo.jpg', { type: 'image/jpeg' })} initial={{ zoom: 2, x: .4, y: -.3 }} onApply={async () => true} onClose={() => {}} />);
  const slider = await screen.findByRole('slider');
  expect((slider as HTMLInputElement).value).toBe('2');
});
