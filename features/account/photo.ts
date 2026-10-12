import sharp from "sharp";
import { MAX_UPLOAD_IMAGE_BYTES } from "../../utils/imageCompression";
export class AccountPhotoError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function readPhotoUpload(request: Request): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > MAX_UPLOAD_IMAGE_BYTES)
    throw new AccountPhotoError("Choose a photo below 4.4 MB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AccountPhotoError("Choose a photo first.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_UPLOAD_IMAGE_BYTES) {
        await reader.cancel();
        throw new AccountPhotoError("Choose a photo below 4.4 MB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length);
}
export async function normaliseAccountPhoto(
  bytes: Buffer,
  mime: string,
): Promise<Buffer> {
  if (bytes.length > MAX_UPLOAD_IMAGE_BYTES)
    throw new AccountPhotoError("Choose a photo below 4.4 MB.", 413);
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
    throw new AccountPhotoError("Choose a JPG, PNG or WebP photo.", 415);
  try {
    const image = sharp(bytes, { limitInputPixels: 20_000_000 });
    const meta = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
      (meta.pages ?? 1) > 1
    )
      throw new AccountPhotoError(
        "Choose a still JPG, PNG or WebP photo.",
        415,
      );
    const result = await image
      .rotate()
      .resize(192, 192, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
    if (result.length > 65536)
      throw new AccountPhotoError(
        "This photo could not be prepared. Try another image.",
      );
    return result;
  } catch (error) {
    if (error instanceof AccountPhotoError) throw error;
    throw new AccountPhotoError(
      "This photo could not be opened. Choose a valid JPG, PNG or WebP.",
    );
  }
}
