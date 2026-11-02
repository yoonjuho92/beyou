'use client';

import { useEffect } from 'react';

/**
 * 모바일 키보드가 올라와도 배경 장면(하늘·풀밭·비유)은 그대로 두고 입력창만 키보드 위로 올린다.
 * visualViewport(실제로 보이는 영역)를 읽어 CSS 변수로 내려 준다.
 *   --app-h  앱 높이 = 레이아웃 뷰포트 높이 (키보드와 무관하게 고정)
 *   --vvtop  iOS가 포커스된 입력창을 보이려고 화면을 민 만큼. 앱을 그만큼 내려 장면이 제자리에 보이게 한다.
 *   --kb     키보드 높이. 입력창을 이만큼 위로 올린다.
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
        const keyboard = Math.max(0, window.innerHeight - vv.height);
        root.style.setProperty('--app-h', `${window.innerHeight}px`);
        root.style.setProperty('--vvtop', `${vv.offsetTop}px`);
        root.style.setProperty('--kb', `${keyboard}px`);
      });
    };

    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      for (const name of ['--app-h', '--vvtop', '--kb']) root.style.removeProperty(name);
    };
  }, []);
}
