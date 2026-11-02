import { GRID_SIZE, KEEP } from './palette';

/** base 위에 (x, y)부터 rows를 덮어 그리는 오버레이. '_'(KEEP)은 베이스 유지. */
export type Patch = {
  x: number;
  y: number;
  rows: readonly string[];
};

export function compose(base: readonly string[], patches: readonly Patch[]): string[] {
  const grid = base.map((row) => row.split(''));
  for (const { x, y, rows } of patches) {
    rows.forEach((row, dy) => {
      [...row].forEach((c, dx) => {
        const gy = y + dy;
        const gx = x + dx;
        if (c === KEEP || gy < 0 || gy >= GRID_SIZE || gx < 0 || gx >= GRID_SIZE) return;
        grid[gy][gx] = c;
      });
    });
  }
  return grid.map((row) => row.join(''));
}
