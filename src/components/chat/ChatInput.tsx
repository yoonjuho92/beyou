'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { pixelOutline, pixelRoundClip } from './pixelShape';

/** 픽셀 한 칸 크기(px). 구름의 모든 계단·혹 크기는 이 배수로 맞춘다. */
const PX = 4;
const BODY_CLIP = pixelRoundClip(5, PX);
const BUTTON_CLIP = pixelRoundClip(2, 3);
/** 말풍선·간식 버튼과 같은 갈색 외곽선 + 아래쪽 픽셀 그림자 */
const CLOUD_OUTLINE = pixelOutline('#5b3a29', 3, '0 6px 0 rgba(91,58,41,0.2)');
const BUTTON_OUTLINE = pixelOutline('#5b3a29', 2);

/** 구름 위쪽 혹: 크기는 PX의 짝수 배 (픽셀 원) */
const BUMPS: { size: number; top: number; left?: string; right?: string }[] = [
  { size: 48, top: -20, left: '9%' },
  { size: 72, top: -36, left: '22%' },
  { size: 56, top: -24, left: '44%' },
  { size: 64, top: -28, right: '13%' },
];

type Props = {
  onSend: (text: string) => void;
  /** 입력 내용이 바뀔 때마다 (말 걸기 타이머가 입력 중인지 알 수 있게) */
  onDraftChange?: (value: string) => void;
  disabled?: boolean;
  maxLength: number;
  placeholder: string;
  /** 다 만들어진 추천 문구. 입력창이 비어 있을 때 보내기(Enter)를 누르면 이 문구를 그대로 보낸다. */
  suggestion?: string | null;
};

/** 픽셀 뭉게구름 모양 입력창. 위쪽 몽실몽실한 혹은 장식용 픽셀 원이다. */
export function ChatInput({ onSend, onDraftChange, disabled = false, maxLength, placeholder, suggestion }: Props) {
  const [value, setValue] = useState('');
  const trimmed = value.trim();
  const toSend = trimmed || suggestion?.trim() || '';

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!toSend || disabled) return;
    onSend(toSend);
    setValue('');
    onDraftChange?.('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // 한글 IME 조합 중 Enter는 글자 확정용이므로 전송하지 않는다.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="relative pt-9">
      {/* 픽셀 구름: 혹(픽셀 원)들과 본체를 하나로 묶어 바깥에 픽셀 외곽선을 두른다 */}
      <div className="relative" style={{ filter: CLOUD_OUTLINE }}>
        {/* 구름 윗부분의 몽실몽실한 혹 */}
        {BUMPS.map((b) => (
          <span
            key={b.left ?? b.right}
            aria-hidden
            className="absolute bg-white"
            style={{
              top: b.top,
              left: b.left,
              right: b.right,
              width: b.size,
              height: b.size,
              clipPath: pixelRoundClip(b.size / PX / 2, PX),
            }}
          />
        ))}

        <div
          className="relative flex items-end gap-2 bg-white px-4 py-2.5 sm:px-5 sm:py-3"
          style={{ clipPath: BODY_CLIP }}
        >
          <label htmlFor="chat-input" className="sr-only">
            메시지
          </label>
          <textarea
            id="chat-input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              onDraftChange?.(e.target.value);
            }}
            onKeyDown={onKeyDown}
            maxLength={maxLength}
            rows={1}
            enterKeyHint="send"
            autoComplete="off"
            placeholder={placeholder}
            className="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:truncate placeholder:text-bark/40 sm:text-[15px]"
          />
          <span className="shrink-0 self-center p-[3px]" style={{ filter: BUTTON_OUTLINE }}>
            <button
              type="submit"
              disabled={disabled || !toSend}
              className="block h-9 bg-[#8cc8ef] px-4 text-sm font-semibold text-white transition hover:bg-[#74b9e6] disabled:opacity-40"
              style={{ clipPath: BUTTON_CLIP }}
            >
              보내기
            </button>
          </span>
        </div>
      </div>
    </form>
  );
}
