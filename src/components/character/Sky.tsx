/**
 * 픽셀 하늘: 위에서 지평선으로 밝아지는 그라데이션 + 해 + 천천히 흘러가는 구름.
 * 구름 이동은 CSS 애니메이션(globals.css의 sky-drift)이며 prefers-reduced-motion이면 멈춘다.
 */

// 범례: . 투명  W 구름  s 구름 아래 그림자
// prettier-ignore
const CLOUD = [
  '.....WWW........',
  '...WWWWWW.WWW...',
  '..WWWWWWWWWWWW..',
  '.WWWWWWWWWWWWWW.',
  'WWWWWWWWWWWWWWWW',
  '.ssssssssssssss.',
];

// prettier-ignore
const SUN = [
  '...YYYY...',
  '.YYYYYYYY.',
  '.YYYYYYYY.',
  'YYYYYYYYYY',
  'YYYYYYYYYY',
  'YYYYYYYYYY',
  'YYYYYYYYYY',
  '.YYYYYYYY.',
  '.YYYYYYYY.',
  '...YYYY...',
];

const COLORS: Record<string, string> = { W: '#ffffff', s: '#cfe8fb', Y: '#ffd85e' };

const CLOUDS = [
  { top: '6%', px: 6, duration: 95, delay: -10, opacity: 0.95 },
  { top: '15%', px: 4, duration: 120, delay: -70, opacity: 0.8 },
  { top: '24%', px: 5, duration: 105, delay: -40, opacity: 0.9 },
  { top: '10%', px: 3, duration: 140, delay: -110, opacity: 0.7 },
  { top: '31%', px: 3, duration: 150, delay: -20, opacity: 0.65 },
];

function PixelArt({ grid, px }: { grid: string[]; px: number }) {
  return (
    <svg
      viewBox={`0 0 ${grid[0].length} ${grid.length}`}
      width={grid[0].length * px}
      height={grid.length * px}
      shapeRendering="crispEdges"
      className="pixelated"
    >
      {grid.flatMap((row, y) =>
        [...row].map((c, x) => (COLORS[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={COLORS[c]} /> : null)),
      )}
    </svg>
  );
}

export function Sky() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={{ background: 'linear-gradient(180deg, #3d9be9 0%, #6ab9f2 22%, #a3d8fa 38%, #d9f1ff 44%)' }}
    >
      <div className="absolute top-[7%] left-[8%] drop-shadow-[0_0_24px_rgba(255,216,94,0.8)]">
        <PixelArt grid={SUN} px={6} />
      </div>
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="sky-drift absolute left-0"
          style={{ top: c.top, opacity: c.opacity, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}
        >
          <PixelArt grid={CLOUD} px={c.px} />
        </div>
      ))}
    </div>
  );
}
