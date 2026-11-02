import { CARROT_ICON } from '@/components/character/llama/carrotIcon';
import { PALETTE, type PixelChar } from '@/components/character/llama/palette';

/** 간식 버튼 아이콘 (비유와 같은 팔레트) */
export function PixelCarrot({ size = 32 }: { size?: number }) {
  return (
    <svg
      viewBox={`0 0 ${CARROT_ICON[0].length} ${CARROT_ICON.length}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="pixelated"
      aria-hidden
    >
      {CARROT_ICON.flatMap((row, y) =>
        [...row].map((c, x) => {
          const fill = PALETTE[c as PixelChar];
          return fill ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} /> : null;
        }),
      )}
    </svg>
  );
}
