'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useCharacterStore } from '@/stores/characterStore';
import { PixelLlama } from './llama/PixelLlama';

const SPEED_PX_PER_SEC = 45;
/** base.ts 기준 얼굴 중심 열(8)의 가운데. 말풍선 꼬리가 여기를 가리킨다. */
const FACE_CENTER = 8.5 / 24;

/**
 * 풀밭 위를 둥실 떠다니며 돌아다니는 비유.
 * - 늘 위아래로 부유하고, 풀밭에 그림자가 따라간다.
 * - stayPut이 아니면 상하좌우 무작위 지점으로 천천히 날아가고 잠깐 쉬기를 반복한다 (아래쪽일수록 가까워 보이게 조금 커짐).
 * - stayPut(생각·말하기·감정 표현 중)이면 그 자리에 멈추고, 머리 위에 bubble을 띄운다. 위치는 바뀌지 않는다.
 * prefers-reduced-motion이면 이동·부유를 멈춘다 (프레임 전환은 유지).
 *
 * 부모 요소가 돌아다닐 영역이 된다 (relative + 크기 지정).
 */
export function Character({ scale = 5, bubble, onPoke }: { scale?: number; bubble?: ReactNode; onPoke?: () => void }) {
  const state = useCharacterStore((s) => s.state);
  const stayPut = useCharacterStore((s) => s.stayPut);
  const reduceMotion = useReducedMotion();
  const size = 24 * scale;

  const areaRef = useRef<HTMLDivElement>(null);
  const [areaHeight, setAreaHeight] = useState(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const tilt = useMotionValue(0);
  // 영역이 비유보다 낮아지거나(화면 회전 등) y가 아직 영역 밖이어도 배율이 튀지 않도록 0~1로 묶는다.
  const depth = useTransform(y, (v) => {
    const range = areaHeight - size;
    const t = range > 0 ? Math.min(1, Math.max(0, v / range)) : 0.5;
    return 0.85 + 0.3 * t;
  });
  // 아래 기준으로 축소된 만큼 말풍선도 내려서 머리 바로 위에 붙인다.
  const bubbleDrop = useTransform(depth, (d) => size * (1 - d));

  // 처음엔 가운데, 화면 크기가 바뀌면 영역 안으로 끌어당긴다.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    let first = true;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setAreaHeight(height);
      const maxX = Math.max(0, width - size);
      const maxY = Math.max(0, height - size);
      if (first) {
        x.set(maxX / 2);
        y.set(maxY * 0.4);
        first = false;
      } else {
        x.set(Math.min(x.get(), maxX));
        y.set(Math.min(y.get(), maxY));
      }
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [size, x, y]);

  // 돌아다니기: 멈춰야 할 때는 진행 중인 비행을 그 자리에서 멈춘다.
  useEffect(() => {
    if (stayPut || reduceMotion) return;
    let cancelled = false;
    let running: AnimationPlaybackControls[] = [];
    let restTimer: ReturnType<typeof setTimeout> | undefined;

    const fly = () => {
      const area = areaRef.current;
      if (!area || cancelled) return;
      const maxX = Math.max(0, area.clientWidth - size);
      const maxY = Math.max(0, area.clientHeight - size);
      // 좌우뿐 아니라 위아래로도 확실히 오가도록, 세로는 지금 있는 쪽의 반대편 절반에서 고른다.
      const tx = Math.random() * maxX;
      const ty = (y.get() < maxY / 2 ? 0.55 + Math.random() * 0.45 : Math.random() * 0.45) * maxY;
      const duration = Math.max(1.5, Math.hypot(tx - x.get(), ty - y.get()) / SPEED_PX_PER_SEC);

      running = [
        animate(x, tx, { duration, ease: 'easeInOut' }),
        animate(y, ty, { duration, ease: 'easeInOut' }),
        animate(tilt, Math.sign(tx - x.get()) * 5, { duration: 0.6 }),
      ];
      running[0].finished.then(() => {
        if (cancelled) return;
        animate(tilt, 0, { duration: 0.6 });
        restTimer = setTimeout(fly, 800 + Math.random() * 2200);
      });
    };

    restTimer = setTimeout(fly, 600);
    return () => {
      cancelled = true;
      clearTimeout(restTimer);
      running.forEach((c) => c.stop());
      animate(tilt, 0, { duration: 0.3 });
    };
  }, [stayPut, reduceMotion, size, x, y, tilt]);

  return (
    <div ref={areaRef} className="absolute inset-0">
      <motion.div className="absolute top-0 left-0" style={{ x, y, width: size, height: size, zIndex: 10 }}>
        {/* 말풍선은 비유와 함께 위아래로 흔들려 간격이 일정하다 */}
        <motion.div
          className="h-full"
          animate={reduceMotion ? { y: 0 } : { y: [-10, 10, -10] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
        >
          {bubble && (
            <motion.div className="absolute bottom-full mb-2" style={{ left: `${FACE_CENTER * 100}%`, y: bubbleDrop }}>
              {bubble}
            </motion.div>
          )}
          <motion.div style={{ scale: depth, rotate: tilt }} className="origin-bottom">
            {/* 클릭(탭)하면 콕 찔린 듯 살짝 눌렸다가 반응한다 */}
            <motion.button
              type="button"
              onClick={onPoke}
              disabled={!onPoke}
              aria-label="비유 콕 찌르기"
              className="block cursor-pointer"
              whileTap={reduceMotion ? undefined : { scale: 0.9, y: 4 }}
              transition={{ type: 'spring', stiffness: 600, damping: 15 }}
            >
              <PixelLlama state={state} scale={scale} />
            </motion.button>
          </motion.div>
        </motion.div>
        {/* 풀밭 위 그림자: 높이 뜰수록 작고 옅게 */}
        <motion.div style={{ scale: depth }} className="absolute top-full left-0 w-full origin-top">
          <motion.div
            aria-hidden
            className="mx-auto mt-2 h-2 rounded-[50%] bg-[#2f5d2a]"
            style={{ width: 14 * scale }}
            animate={reduceMotion ? { scaleX: 1, opacity: 0.25 } : { scaleX: [0.8, 1, 0.8], opacity: [0.16, 0.28, 0.16] }}
            transition={reduceMotion ? { duration: 0 } : { duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
