import { expect, it } from "vitest";
import sharp from "sharp";
import {
  normaliseAccountPhoto,
  readPhotoUpload,
} from "../../features/account/photo";
it("produces a small square WebP and strips source metadata", async () => {
  const input = await sharp({
    create: { width: 600, height: 300, channels: 3, background: "#010066" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const photo = await normaliseAccountPhoto(input, "image/jpeg");
  const meta = await sharp(photo).metadata();
  expect([meta.width, meta.height, meta.format]).toEqual([192, 192, "webp"]);
  expect(meta.exif).toBeUndefined();
  expect(photo.length).toBeLessThan(65536);
});
it("rejects SVG, spoofed files, animation and oversized uploads", async () => {
  await expect(
    normaliseAccountPhoto(Buffer.from("<svg/>"), "image/svg+xml"),
  ).rejects.toMatchObject({ status: 415 });
  await expect(
    normaliseAccountPhoto(Buffer.from("not a photo"), "image/png"),
  ).rejects.toMatchObject({ status: 400 });
  const gif = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  })
    .gif()
    .toBuffer();
  await expect(normaliseAccountPhoto(gif, "image/png")).rejects.toMatchObject({
    status: 415,
  });
  await expect(
    normaliseAccountPhoto(Buffer.alloc(4400001), "image/png"),
  ).rejects.toMatchObject({ status: 413 });
});
it("bounds a streamed request even without a content-length header", async () => {
  const request = new Request("https://masca.org.au/api/account/photo", {
    method: "POST",
    body: new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(4400001));
        c.close();
      },
    }),
    duplex: "half",
  } as RequestInit);
  await expect(readPhotoUpload(request)).rejects.toMatchObject({ status: 413 });
});
