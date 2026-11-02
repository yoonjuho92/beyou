import type { Daylight } from './daylight';

/**
 * 픽셀 하늘: 위에서 지평선으로 밝아지는 그라데이션 + 해 + 천천히 흘러가는 구름.
 * 시각에 따라(useDaylight) 노을·밤 하늘을 겹쳐 어두워지고, 해가 지면 달과 별이 뜬다.
 * 구름 이동·별 반짝임은 CSS 애니메이션(globals.css)이며 prefers-reduced-motion이면 멈춘다.
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

// 오른쪽이 비어 있는 초승달
// prettier-ignore
const MOON = [
  '...MMMM...',
  '.MMMMM....',
  '.MMMM.....',
  'MMMM......',
  'MMMm......',
  'MMMm......',
  'MMMM......',
  '.MMMM.....',
  '.MMMMM....',
  '...MMMM...',
];

const COLORS: Record<string, string> = { W: '#ffffff', s: '#cfe8fb', Y: '#ffd85e', M: '#fff4c2', m: '#efe0a0' };

const SKY = {
  day: 'linear-gradient(180deg, #3d9be9 0%, #6ab9f2 22%, #a3d8fa 38%, #d9f1ff 44%)',
  dusk: 'linear-gradient(180deg, #4a5fa8 0%, #c46b8e 24%, #f59a6b 37%, #ffd29a 44%)',
  night: 'linear-gradient(180deg, #0b1236 0%, #16224f 22%, #2a3b70 37%, #40548a 44%)',
};

/** 밤하늘 별 (지평선 위 하늘 영역 안). size는 픽셀 칸 수, delay는 반짝임 엇갈림 */
const STARS = [
  { left: '22%', top: '5%', size: 2, delay: 0 },
  { left: '34%', top: '14%', size: 1, delay: 1.2 },
  { left: '46%', top: '6%', size: 2, delay: 2.1 },
  { left: '57%', top: '19%', size: 1, delay: 0.6 },
  { left: '66%', top: '9%', size: 2, delay: 1.7 },
  { left: '78%', top: '26%', size: 1, delay: 2.6 },
  { left: '88%', top: '12%', size: 1, delay: 0.3 },
  { left: '12%', top: '24%', size: 1, delay: 1.9 },
  { left: '29%', top: '31%', size: 1, delay: 0.9 },
  { left: '71%', top: '33%', size: 1, delay: 2.4 },
  { left: '51%', top: '28%', size: 2, delay: 1.4 },
  { left: '94%', top: '30%', size: 1, delay: 0.1 },
];

/** 시각이 바뀔 때 하늘 층이 툭 바뀌지 않게 */
const FADE = 'opacity 2s linear, transform 2s linear, filter 2s linear';

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

export function Sky({ daylight }: { daylight: Daylight }) {
  const { darkness, glow } = daylight;
  // 노을빛은 아직 어두워지기 전에 가장 잘 보이고, 밤 하늘에 덮이며 사라진다.
  const duskOpacity = glow * (1 - darkness * 0.6);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={{ background: SKY.day }}
    >
      <div className="absolute inset-0" style={{ background: SKY.dusk, opacity: duskOpacity, transition: FADE }} />
      <div className="absolute inset-0" style={{ background: SKY.night, opacity: darkness, transition: FADE }} />

      {/* 별: 어두워질수록 나타난다 */}
      {STARS.map((star) => (
        <span
          key={`${star.left}-${star.top}`}
          className="absolute"
          style={{ left: star.left, top: star.top, opacity: Math.max(0, darkness * 1.3 - 0.3), transition: FADE }}
        >
          <span
            className="star-twinkle block bg-[#fff8dc]"
            style={{ width: star.size * 3, height: star.size * 3, animationDelay: `${star.delay}s` }}
          />
        </span>
      ))}

      {/* 해: 저녁이 되면 지평선 쪽으로 내려가며 사라진다 */}
      <div
        className="absolute top-[7%] left-[8%]"
        style={{
          opacity: 1 - darkness,
          transform: `translateY(${darkness * 26}vh)`,
          filter: `drop-shadow(0 0 24px rgba(${glow > 0 ? '255,160,90' : '255,216,94'},0.8))`,
          transition: FADE,
        }}
      >
        <PixelArt grid={SUN} px={6} />
      </div>

      {/* 달: 밤에 떠오른다 */}
      <div
        className="absolute top-[8%] left-[10%]"
        style={{
          opacity: darkness,
          transform: `translateY(${(1 - darkness) * 12}vh)`,
          filter: 'drop-shadow(0 0 18px rgba(255,244,194,0.55))',
          transition: FADE,
        }}
      >
        <PixelArt grid={MOON} px={5} />
      </div>

      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="sky-drift absolute left-0"
          style={{
            top: c.top,
            opacity: c.opacity * (1 - darkness * 0.35),
            // 밤에는 구름도 어둡고 푸르스름하게
            filter: `brightness(${1 - darkness * 0.55}) saturate(${1 - darkness * 0.3})`,
            transition: FADE,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <PixelArt grid={CLOUD} px={c.px} />
        </div>
      ))}
    </div>
  );
}
