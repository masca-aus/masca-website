// Leave 100 KB for the multipart boundaries and CMS fields below Vercel's 4.5 MB limit.
export const MAX_UPLOAD_IMAGE_BYTES = 4_400_000;

export async function compressUploadImage(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_IMAGE_BYTES) return file;
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('This image is too large. Choose a JPEG or PNG photo for automatic compression, or a file below 4.4 MB.');
  }
  if (file.type === 'image/png') {
    // APNG must not silently lose its animation when rendered onto a canvas.
    const bytes = new DataView(await file.arrayBuffer());
    for (let offset = 8; offset + 12 <= bytes.byteLength;) {
      const length = bytes.getUint32(offset);
      if (bytes.getUint32(offset + 4) === 0x6163544c) throw new Error('Animated images must be below 4.4 MB. Choose a still JPEG or PNG photo for automatic compression.');
      offset += length + 12;
    }
  }
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare this photo. Please choose a smaller image.');
    let scale = Math.min(1, Math.sqrt(16_000_000 / (image.width * image.height)));
    for (let attempt = 0; attempt < 12; attempt++) {
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      // PNG remains lossless and transparent; JPEG quality is lowered before dimensions.
      const qualities = file.type === 'image/jpeg' ? [.96, .92, .88, .84, .8] : [1];
      for (const quality of qualities) {
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to compress this photo. Please choose a smaller image.')), file.type, quality));
        if (blob.size <= MAX_UPLOAD_IMAGE_BYTES) return new File([blob], file.name, { type: blob.type, lastModified: file.lastModified });
      }
      scale *= .8;
    }
    throw new Error('Unable to fit this image within the upload limit. Please choose a smaller image.');
  } finally {
    image.close();
    canvas.width = canvas.height = 0;
  }
}
