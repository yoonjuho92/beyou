'use client';

import { useEffect, useRef, useState } from 'react';
import { FRAMES, TICK_MS, type LlamaState } from './frames';
import { GRID_SIZE, PALETTE, type PixelChar } from './palette';

type Props = {
  state: LlamaState;
  /** 1픽셀당 화면 px. 기본 8 → 192px */
  scale?: number;
};

/**
 * 24×24 캔버스 한 장에 프레임을 그리고, CSS로 픽셀 그대로(pixelated) 키운다.
 * 픽셀마다 SVG <rect>를 쓰면 비유가 기울어질 때 사각형 경계마다 안티앨리어싱이 걸려
 * 틈으로 배경이 비치는 격자 무늬가 생긴다. 한 장의 비트맵은 통째로 회전하므로 틈이 없다.
 */
export function PixelLlama({ state, scale = 8 }: Props) {
  const [tick, setTick] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setTick(0);
    if (FRAMES[state].length <= 1) return;
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, [state]);

  const frames = FRAMES[state];
  const frame = frames[tick % frames.length];

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE);
    frame.forEach((row, y) => {
      [...row].forEach((c, x) => {
        const fill = PALETTE[c as PixelChar];
        if (!fill) return;
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, 1, 1);
      });
    });
  }, [frame]);

  const size = GRID_SIZE * scale;

  return (
    <canvas
      ref={canvasRef}
      width={GRID_SIZE}
      height={GRID_SIZE}
      className="pixelated block"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`픽셀 라마 비유 (${state})`}
    />
  );
}
