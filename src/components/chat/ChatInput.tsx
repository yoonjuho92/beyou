'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';

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

/** 뭉게구름 모양 입력창. 위쪽 몽실몽실한 혹은 장식용 원이다. */
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
    <form onSubmit={submit} className="relative pt-5">
      {/* 구름 윗부분의 몽실몽실한 혹 */}
      <span aria-hidden className="absolute top-2 left-[10%] h-14 w-14 rounded-full bg-white" />
      <span aria-hidden className="absolute top-0 left-[24%] h-20 w-20 rounded-full bg-white" />
      <span aria-hidden className="absolute top-3 left-[46%] h-14 w-16 rounded-full bg-white" />
      <span aria-hidden className="absolute top-1 right-[14%] h-16 w-16 rounded-full bg-white" />

      <div className="relative flex items-end gap-2 rounded-[2.5rem] bg-white px-4 py-2.5 shadow-[0_8px_0_0_rgba(140,170,200,0.35)] sm:px-5 sm:py-3">
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
        <button
          type="submit"
          disabled={disabled || !toSend}
          className="h-10 shrink-0 rounded-full bg-[#8cc8ef] px-4 text-sm font-semibold text-white transition hover:bg-[#74b9e6] disabled:opacity-40"
        >
          보내기
        </button>
      </div>
    </form>
  );
}
