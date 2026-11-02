'use client';

import { useEffect, useState } from 'react';

/** Safari(iPad 등)는 아직 webkit 접두사 API만 지원한다. */
type WebkitDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function fullscreenElement(doc: WebkitDocument) {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/**
 * 전체화면 토글. 전체화면 중에는 globals.css의 `html:fullscreen` 규칙이 로그아웃 버튼을 숨긴다.
 * 전체화면 API가 없는 브라우저(iPhone Safari 등)에서는 버튼을 그리지 않는다.
 */
export function FullscreenButton() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const doc = document as WebkitDocument;
    setSupported(Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled));
    const sync = () => setActive(fullscreenElement(doc) !== null);
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  async function toggle() {
    const doc = document as WebkitDocument;
    const root = document.documentElement as WebkitElement;
    try {
      if (fullscreenElement(doc)) await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      else await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
    } catch (err) {
      console.warn('[fullscreen]', err);
    }
  }

  if (!supported) return null;
  const label = active ? '전체화면 끝내기' : '전체화면';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-bark/70 backdrop-blur transition hover:bg-white"
    >
      <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        {active ? (
          // 안쪽으로 모이는 네 모서리
          <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" />
        ) : (
          // 바깥으로 펼쳐지는 네 모서리
          <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
        )}
      </svg>
    </button>
  );
}
