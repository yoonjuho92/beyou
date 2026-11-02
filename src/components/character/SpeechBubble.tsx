'use client';

import { motion } from 'framer-motion';
import { useLayoutEffect, useRef, useState } from 'react';

type Props = {
  text: string;
  pending?: boolean;
};

const EDGE = 12;

/**
 * 비유 머리 위에 뜨는 말풍선. 부모가 비유 중심(left: 50%)에 붙여 준다.
 * 화면 가장자리에 걸리면 풍선만 안쪽으로 밀고, 꼬리는 계속 비유를 가리킨다.
 */
export function SpeechBubble({ text, pending = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const naturalLeft = rect.left - shift;
    const naturalRight = rect.right - shift;
    if (naturalLeft < EDGE) setShift(EDGE - naturalLeft);
    else if (naturalRight > window.innerWidth - EDGE) setShift(window.innerWidth - EDGE - naturalRight);
    else setShift(0);
    // 내용이 바뀔 때마다 다시 맞춘다
  }, [text, pending]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} className="w-max max-w-[min(22rem,calc(100vw-1.5rem))]" style={{ transform: `translateX(calc(-50% + ${shift}px))` }}>
      <motion.div
        aria-live="polite"
        initial={{ opacity: 0, scale: 0.8, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
        style={{ transformOrigin: `calc(50% - ${shift}px) 100%` }}
        className="relative rounded-2xl border-[3px] border-bark bg-white px-4 py-3 text-[15px] leading-relaxed shadow-[4px_4px_0_0_rgba(91,58,41,0.25)]"
      >
        <span
          aria-hidden
          className="absolute -bottom-[11px] h-4 w-4 rotate-[-45deg] border-b-[3px] border-l-[3px] border-bark bg-white"
          style={{ left: `calc(50% - ${shift}px - 8px)` }}
        />
        <div className="max-h-[28dvh] overflow-y-auto">
          {pending && !text ? (
            <span className="inline-flex gap-1 py-1" aria-label="생각 중">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-pulse bg-bark/50" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </span>
          ) : (
            <p className="whitespace-pre-wrap">{text}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
