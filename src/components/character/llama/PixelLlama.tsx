'use client';

import { memo, useEffect, useState } from 'react';
import { FRAMES, TICK_MS, type LlamaState } from './frames';
import { GRID_SIZE, PALETTE, type PixelChar } from './palette';

type Props = {
  state: LlamaState;
  /** 1픽셀당 화면 px. 기본 8 → 192px */
  scale?: number;
};

const Grid = memo(function Grid({ frame }: { frame: readonly string[] }) {
  return frame.flatMap((row, y) =>
    [...row].map((c, x) => {
      const fill = PALETTE[c as PixelChar];
      return fill ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} /> : null;
    }),
  );
});

export function PixelLlama({ state, scale = 8 }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick(0);
    if (FRAMES[state].length <= 1) return;
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, [state]);

  const frames = FRAMES[state];
  const frame = frames[tick % frames.length];
  const size = GRID_SIZE * scale;

  return (
    <svg
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="pixelated"
      role="img"
      aria-label={`픽셀 라마 비유 (${state})`}
    >
      <Grid frame={frame} />
    </svg>
  );
}
