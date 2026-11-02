/**
 * 하루 중 시각(0~24시, 소수)에 따른 하늘 상태.
 *   darkness  0 = 낮, 1 = 밤. 저녁 17:30~19:30에 어두워지고 새벽 4:30~6:30에 밝아진다.
 *   glow      노을·여명의 주황빛 세기 0~1. 해 질 녘(18:15)·해 뜰 녘(5:30)에 가장 진하다.
 */
export type Daylight = { darkness: number; glow: number };

const DUSK = { start: 17.5, end: 19.5 };
const DAWN = { start: 4.5, end: 6.5 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** 양 끝이 부드러운 0→1 곡선 */
const smooth = (t: number) => t * t * (3 - 2 * t);
/** center에서 1, ±width에서 0인 종 모양 */
const bell = (h: number, center: number, width: number) => smooth(clamp01(1 - Math.abs(h - center) / width));

export function daylightAt(hours: number): Daylight {
  const h = ((hours % 24) + 24) % 24;
  let darkness: number;
  if (h >= DUSK.start && h < DUSK.end) darkness = smooth((h - DUSK.start) / (DUSK.end - DUSK.start));
  else if (h >= DAWN.start && h < DAWN.end) darkness = 1 - smooth((h - DAWN.start) / (DAWN.end - DAWN.start));
  else darkness = h >= DUSK.end || h < DAWN.start ? 1 : 0;

  const glow = Math.max(bell(h, 18.25, 1.5), bell(h, 5.5, 1.25));
  return { darkness, glow };
}
