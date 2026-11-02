'use client';

import { useEffect } from 'react';

/**
 * 모바일 키보드에 맞춰 화면 높이를 줄인다.
 * iOS Safari는 키보드가 올라와도 100dvh가 그대로라 입력창이 키보드에 가리거나 화면 전체가 밀려 올라간다.
 * visualViewport(실제로 보이는 영역)의 높이·위치를 CSS 변수로 내려 주고, 앱 컨테이너가 이를 따른다.
 *   --vvh   보이는 영역 높이 (기본 100dvh)
 *   --vvtop 보이는 영역의 위쪽 오프셋 (iOS가 페이지를 스크롤했을 때 그만큼 따라 내려간다)
 */
export function useVisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--vvh', `${vv.height}px`);
        root.style.setProperty('--vvtop', `${vv.offsetTop}px`);
      });
    };

    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      root.style.removeProperty('--vvh');
      root.style.removeProperty('--vvtop');
    };
  }, []);
}
