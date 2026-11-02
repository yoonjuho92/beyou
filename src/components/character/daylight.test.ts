import { describe, expect, it } from 'vitest';
import { daylightAt } from './daylight';

describe('daylightAt', () => {
  it('is bright during the day and dark at night', () => {
    expect(daylightAt(12)).toEqual({ darkness: 0, glow: 0 });
    expect(daylightAt(23).darkness).toBe(1);
    expect(daylightAt(2).darkness).toBe(1);
  });

  it('darkens gradually through the evening and brightens at dawn', () => {
    const evening = [17, 18, 18.5, 19, 20].map((h) => daylightAt(h).darkness);
    for (let i = 1; i < evening.length; i++) expect(evening[i]).toBeGreaterThanOrEqual(evening[i - 1]);
    expect(daylightAt(18.5).darkness).toBeGreaterThan(0);
    expect(daylightAt(18.5).darkness).toBeLessThan(1);

    const dawn = [4, 5, 5.5, 6, 7].map((h) => daylightAt(h).darkness);
    for (let i = 1; i < dawn.length; i++) expect(dawn[i]).toBeLessThanOrEqual(dawn[i - 1]);
  });

  it('glows orange around sunset and sunrise', () => {
    expect(daylightAt(18.25).glow).toBe(1);
    expect(daylightAt(5.5).glow).toBe(1);
    expect(daylightAt(14).glow).toBe(0);
  });
});
