import { describe, expect, it } from 'vitest';
import { pixelCornerProfile, pixelRoundClip } from './pixelShape';

describe('pixelCornerProfile', () => {
  it('steps inward less on each row, like a quarter pixel circle', () => {
    expect(pixelCornerProfile(6)).toEqual([4, 2, 1, 1]);
    for (const r of [2, 5, 9]) {
      const p = pixelCornerProfile(r);
      for (let i = 1; i < p.length; i++) expect(p[i]).toBeLessThanOrEqual(p[i - 1]);
      expect(p.every((n) => n > 0 && n < r)).toBe(true);
    }
  });

  it('builds a closed polygon with two points per stair row on each corner', () => {
    const clip = pixelRoundClip(6, 4);
    expect(clip.startsWith('polygon(')).toBe(true);
    expect(clip.split(',').length).toBe(4 * 2 * pixelCornerProfile(6).length);
  });
});
