import { describe, expect, it } from 'vitest';
import { BASE } from './base';
import type { Patch } from './compose';
import { FACES, TEARS_FALLEN, THINKING_DOTS, TREAT_PIECES } from './faces';
import { FRAMES, LLAMA_STATES } from './frames';
import { GRID_SIZE, isPixelChar, KEEP } from './palette';
import { TREAT_ICONS } from './treatIcons';

describe('pixel llama grids', () => {
  it('every composed frame is 24×24 and uses only palette characters', () => {
    const grids = [BASE, ...LLAMA_STATES.flatMap((s) => FRAMES[s])];
    for (const grid of grids) {
      expect(grid).toHaveLength(GRID_SIZE);
      for (const row of grid) {
        expect(row).toHaveLength(GRID_SIZE);
        for (const c of row) expect(isPixelChar(c), `unknown char "${c}"`).toBe(true);
      }
    }
    for (const state of LLAMA_STATES) expect(FRAMES[state].length).toBeGreaterThan(0);

    // 간식 버튼 아이콘도 같은 팔레트를 쓴다
    for (const icon of Object.values(TREAT_ICONS)) {
      for (const row of icon) {
        expect(row).toHaveLength(icon[0].length);
        for (const c of row) expect(isPixelChar(c), `unknown icon char "${c}"`).toBe(true);
      }
    }

    // 패치는 그리드 안에 있어야 하고, 팔레트 문자 또는 KEEP만 사용
    const treatPatches: Patch[] = Object.values(TREAT_PIECES).flatMap(({ full, bitten, last, crumbs }) => [full, bitten, last, ...crumbs]);
    const patches: Patch[] = [...Object.values(FACES).flat(), ...THINKING_DOTS, ...TEARS_FALLEN, ...treatPatches];
    for (const patch of patches) {
      patch.rows.forEach((row, dy) => {
        expect(patch.y + dy).toBeLessThan(GRID_SIZE);
        expect(patch.x + row.length).toBeLessThanOrEqual(GRID_SIZE);
        for (const c of row) expect(c === KEEP || isPixelChar(c), `unknown patch char "${c}"`).toBe(true);
      });
    }
  });
});
