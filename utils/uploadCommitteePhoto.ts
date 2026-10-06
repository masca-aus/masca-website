import { compressUploadImage } from './imageCompression';

export type PhotoMedia = { id: number | string; url?: string; filename?: string; sizes?: { 'admin-preview'?: { url?: string } } };

export async function uploadCommitteePhoto(file: File, api: string, signal?: AbortSignal, onStage?: (stage: string) => void): Promise<PhotoMedia> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  onStage?.('Preparing photo…');
  const prepared = await compressUploadImage(file);
  if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError');
  onStage?.('Uploading photo…');
  const body = new FormData();
  body.append('_payload', JSON.stringify({}));
  body.append('file', prepared);
  const response = await fetch(`${api}/media`, { method: 'POST', body, credentials: 'same-origin', signal });
  if (!response.ok) {
    if (response.status === 413) throw new Error('This photo is still too large. Please choose a smaller photo.');
    if (response.status === 401 || response.status === 403) throw new Error('You do not have permission to upload photos. Please sign in again or contact an administrator.');
    throw new Error('The photo could not be uploaded. Please try again.');
  }
  const result = await response.json();
  if (!result.doc || !['string', 'number'].includes(typeof result.doc.id)) throw new Error('The upload did not return a photo. Please try again.');
  return result.doc;
}
