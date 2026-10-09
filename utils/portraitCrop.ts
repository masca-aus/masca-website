const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Pan describes image movement: +1 moves it right/down to the crop edge. */
export function portraitCrop(imageWidth: number, imageHeight: number, zoom: number, panX: number, panY: number) {
  const width = Math.min(imageWidth, imageHeight * .8) / clamp(zoom, 1, 3);
  const height = width / .8;
  return { x: (imageWidth - width) * (1 - clamp(panX, -1, 1)) / 2, y: (imageHeight - height) * (1 - clamp(panY, -1, 1)) / 2, width, height };
}

export async function exportPortrait(file: File, zoom: number, panX: number, panY: number): Promise<File> {
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  try {
    const crop = portraitCrop(image.width, image.height, zoom, panX, panY);
    canvas.width = Math.max(4, Math.floor(Math.min(1200, crop.width) / 4) * 4);
    canvas.height = canvas.width * 5 / 4;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not adjust this photo. Please try another browser.');
    context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to prepare the adjusted photo. Please try again.')), type, .95));
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '').replace(/-portrait$/, '')}-portrait.${type === 'image/png' ? 'png' : 'jpg'}`, { type });
  } finally { image.close(); canvas.width = canvas.height = 0; }
}
