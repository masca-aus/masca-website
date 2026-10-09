import { expect, it } from 'vitest';
import { portraitCrop } from '@/utils/portraitCrop';
it('centres a 4:5 crop without stretching', () => {
  expect(portraitCrop(2000, 1000, 1, 0, 0)).toEqual({ x: 600, y: 0, width: 800, height: 1000 });
});
it('clamps positioning and zoom to the image edges', () => {
  const crop = portraitCrop(1000, 2000, 2, 99, -99);
  expect(crop).toEqual({ x: 0, y: 1375, width: 500, height: 625 });
});
it('never samples outside the original image', () => {
  for (const [w,h] of [[100,100],[3000,4000],[4000,3000]]) for (const zoom of [1,2,3]) {
    const crop=portraitCrop(w,h,zoom,-1,1);
    expect(crop.x).toBeGreaterThanOrEqual(0); expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x+crop.width).toBeLessThanOrEqual(w); expect(crop.y+crop.height).toBeLessThanOrEqual(h);
    expect(crop.width/crop.height).toBeCloseTo(.8);
  }
});
