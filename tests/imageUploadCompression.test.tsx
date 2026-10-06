// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ImageUploadCompression } from '@/components/admin/ImageUploadCompression';
const h = vi.hoisted(() => ({ compress: vi.fn() }));
vi.mock('@/utils/imageCompression', () => ({ MAX_UPLOAD_IMAGE_BYTES: 4_400_000, compressUploadImage: h.compress }));
class Transfer {
  files: File[] = [];
  items = { add: (file: File) => this.files.push(file) };
}
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('DataTransfer', Transfer); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const large = () => new File([new Uint8Array(4_700_000)], 'photo.jpg', { type: 'image/jpeg' });
function inputView(receive: (files: File[]) => void) {
  render(<ImageUploadCompression><input aria-label="Photo" type="file" onChange={e => receive(Array.from(e.target.files || []))} /></ImageUploadCompression>);
  const input = screen.getByLabelText('Photo') as HTMLInputElement;
  // jsdom has no real FileList setter.
  Object.defineProperty(input, 'files', { value: [], writable: true, configurable: true });
  return input;
}
it('holds the original outside Payload and dispatches only the compressed selection', async () => {
  let finish!: (f: File) => void;
  h.compress.mockImplementation(() => new Promise<File>(resolve => { finish = resolve; }));
  const receive = vi.fn(); const input = inputView(receive);
  fireEvent.change(input, { target: { files: [large()] } });
  expect(receive).not.toHaveBeenCalled();
  expect(screen.getByRole('status').textContent).toContain('Optimising');
  const result = new File(['small'], 'photo.jpg');
  await act(async () => finish(result));
  expect(receive).toHaveBeenCalledExactlyOnceWith([result]);
});
it('never queues an oversized original when compression fails', async () => {
  h.compress.mockRejectedValue(new Error('Choose a smaller photo.'));
  const receive = vi.fn(); const input = inputView(receive);
  fireEvent.change(input, { target: { files: [large()] } });
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('smaller photo'));
  expect(receive).not.toHaveBeenCalled();
});
it('ignores stale results when a new smaller file is selected', async () => {
  let finish!: (f: File) => void;
  h.compress.mockImplementation(() => new Promise<File>(resolve => { finish = resolve; }));
  const receive = vi.fn(); const input = inputView(receive);
  fireEvent.change(input, { target: { files: [large()] } });
  const small = new File(['new'], 'new.jpg');
  fireEvent.change(input, { target: { files: [small] } });
  await act(async () => finish(new File(['old'], 'old.jpg')));
  expect(receive).toHaveBeenCalledExactlyOnceWith([small]);
});
it('compresses every file before a bulk selection reaches Payload', async () => {
  const result = new File(['small'], 'photo.jpg'); h.compress.mockResolvedValue(result);
  const receive = vi.fn(); const input = inputView(receive);
  fireEvent.change(input, { target: { files: [large(), large()] } });
  await waitFor(() => expect(receive).toHaveBeenCalledExactlyOnceWith([result, result]));
});
it('intercepts native nested-dropzone uploads before their listeners run', async () => {
  const result = new File(['small'], 'photo.jpg'); h.compress.mockResolvedValue(result);
  class DropEvent extends Event { dataTransfer: Transfer; constructor(type: string, init: EventInit & { dataTransfer: Transfer }) { super(type, init); this.dataTransfer = init.dataTransfer; } }
  vi.stubGlobal('DragEvent', DropEvent);
  render(<ImageUploadCompression><div className="dropzone" data-testid="zone">Drop here</div></ImageUploadCompression>);
  const zone = screen.getByTestId('zone'); const receive = vi.fn();
  zone.addEventListener('drop', e => receive((e as DragEvent).dataTransfer?.files));
  const data = new Transfer(); data.items.add(large());
  fireEvent(zone, new DropEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  expect(receive).not.toHaveBeenCalled();
  await waitFor(() => expect(receive).toHaveBeenCalledExactlyOnceWith([result]));
});
it('shares selection generations across chooser and drop on the same widget', async () => {
  let finish!: (f: File) => void;
  h.compress.mockImplementation(() => new Promise<File>(resolve => { finish = resolve; }));
  class DropEvent extends Event { dataTransfer: Transfer; constructor(type: string, init: EventInit & { dataTransfer: Transfer }) { super(type, init); this.dataTransfer = init.dataTransfer; } }
  vi.stubGlobal('DragEvent', DropEvent);
  const receive = vi.fn();
  render(<ImageUploadCompression><div className="dropzone" data-testid="zone"><input aria-label="Photo" type="file" onChange={receive} /></div></ImageUploadCompression>);
  const zone = screen.getByTestId('zone'); zone.addEventListener('drop', receive);
  const data = new Transfer(); data.items.add(large());
  fireEvent(zone, new DropEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  fireEvent.change(screen.getByLabelText('Photo'), { target: { files: [new File(['new'], 'new.jpg')] } });
  await act(async () => finish(new File(['old'], 'old.jpg')));
  expect(receive).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('status')).toBeNull();
});
