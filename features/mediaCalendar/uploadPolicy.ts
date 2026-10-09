import { CalendarError } from "./validation.ts";
export const acceptedMimes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
];
export function validateUpload(name: string, mime: string, size: number) {
  if (!name.trim() || name.length > 240 || !acceptedMimes.includes(mime))
    throw new CalendarError("Choose a JPEG, PNG, WebP, MP4 or MOV file.");
  if (
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > (mime.startsWith("image/") ? 20 : 50) * 1024 * 1024
  )
    throw new CalendarError("Images can be up to 20 MB; videos up to 50 MB.");
}
export function validSignature(mime: string, b: Uint8Array) {
  if (mime === "image/jpeg")
    return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (mime === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v);
  const text = (a: number, z: number) =>
    new TextDecoder().decode(b.slice(a, z));
  if (mime === "image/webp")
    return text(0, 4) === "RIFF" && text(8, 12) === "WEBP";
  if (mime === "video/mp4" || mime === "video/quicktime")
    return text(4, 8) === "ftyp" && b.length >= 12;
  return false;
}
