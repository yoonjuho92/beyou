import { PALETTE, type PixelChar } from '@/components/character/llama/palette';
import { TREAT_ICONS } from '@/components/character/llama/treatIcons';
import type { TreatId } from '@/lib/chat/treat';

/** 간식 버튼 아이콘 (비유와 같은 팔레트) */
export function PixelTreat({ treat, size = 32 }: { treat: TreatId; size?: number }) {
  const grid = TREAT_ICONS[treat];
  return (
    <svg
      viewBox={`0 0 ${grid[0].length} ${grid.length}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="pixelated"
      aria-hidden
    >
      {grid.flatMap((row, y) =>
        [...row].map((c, x) => {
          const fill = PALETTE[c as PixelChar];
          return fill ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} /> : null;
        }),
      )}
    </svg>
  );
}
