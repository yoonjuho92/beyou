'use client';

import { useEffect, useState } from 'react';
import { daylightAt, type Daylight } from './daylight';

/** 미리보기용: 주소에 ?hour=21 처럼 붙이면 그 시각의 하늘을 보여 준다. */
function previewHour(): number | null {
  const raw = new URLSearchParams(window.location.search).get('hour');
  const h = raw === null ? NaN : Number(raw);
  return Number.isFinite(h) ? h : null;
}

function currentHour(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

/** 기기의 현재 시각으로 하늘 밝기를 계산하고 1분마다 갱신한다. 첫 렌더(서버)는 낮으로 시작한다. */
export function useDaylight(): Daylight {
  const [daylight, setDaylight] = useState<Daylight>({ darkness: 0, glow: 0 });

  useEffect(() => {
    const update = () => setDaylight(daylightAt(previewHour() ?? currentHour()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return daylight;
}
