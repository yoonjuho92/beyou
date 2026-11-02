'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character } from '@/components/character/Character';
import { Meadow } from '@/components/character/Meadow';
import { Sky } from '@/components/character/Sky';
import { SpeechBubble } from '@/components/character/SpeechBubble';
import { parseEmotion, stripEmotionTag } from '@/lib/emotion';
import { cleanHint } from '@/lib/hintText';
import { useCharacterStore } from '@/stores/characterStore';
import type { ChatUIMessage } from '@/types';
import { ChatInput } from './ChatInput';
import { TreatButton } from './TreatButton';
import { useVisualViewport } from './useVisualViewport';

type Props = {
  characterSlug: string;
  characterName: string;
  initialConversationId: string | null;
  initialMessages: ChatUIMessage[];
  maxInputChars: number;
  /** 전에 대화한 적이 있는 유저면 유저 지식을 바탕으로 한 맞춤 인사를 스트리밍한다. */
  returning: boolean;
};

function rawText(message: ChatUIMessage): string {
  return message.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
}

function friendlyError(error: Error): string {
  try {
    const parsed = JSON.parse(error.message) as { error?: unknown };
    if (typeof parsed.error === 'string') return parsed.error;
  } catch {
    // JSON이 아닌 에러 (네트워크 등)
  }
  return '연결이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.';
}

/** 말풍선을 띄워 둘 시간: 글이 길수록 오래 (4~15초) */
function holdFor(text: string): number {
  return Math.min(15_000, Math.max(4_000, 2_500 + text.length * 80));
}

const firstGreeting = (name: string) => `앗, 인간이다…! (귀 쫑긋) 안녕하세요, 저는 ${name}예요. 뿌우.`;
const fallbackGreeting = '또 만났네요! (꼬리 살랑) 반가워요, 뿌우.';

/** 유저가 조용하면 말풍선이 사라진 뒤 20~30초(랜덤) 후에 비유가 먼저 말을 건다. */
const NUDGE_MIN_MS = 20_000;
const NUDGE_MAX_MS = 30_000;
/** 답이 없으면 연속으로 이만큼만 말을 걸고 멈춘다 (켜 두기만 한 탭에서 LLM이 계속 호출되지 않게). */
const MAX_NUDGES = 3;

type ProactiveKind = 'greeting' | 'nudge';

export function ChatContainer({
  characterSlug,
  characterName,
  initialConversationId,
  initialMessages,
  maxInputChars,
  returning,
}: Props) {
  useVisualViewport();
  const conversationIdRef = useRef<string | null>(initialConversationId);
  const [hint, setHint] = useState<string | null>(null);
  /**
   * 비유가 먼저 한 말(인사·말 걸기). at = 그때의 messages.length.
   * 그 뒤로 채팅이 오가지 않았으면(at === messages.length) 이 말을 말풍선에 띄운다.
   */
  const [spoken, setSpoken] = useState({ text: returning ? '' : firstGreeting(characterName), at: initialMessages.length });
  const [proactivePending, setProactivePending] = useState(returning);
  const proactiveAbortRef = useRef<AbortController | null>(null);
  const messagesLengthRef = useRef(initialMessages.length);
  /** 말 걸기 스케줄링용: 연속 말 걸기 횟수, 마지막 입력 시각, 입력창 내용 */
  const nudgesRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const draftRef = useRef('');
  /** 간식 답변을 기다리는 중. 로딩(생각 중 점) 대신 먹는 모션을 보여 준다. */
  const [treating, setTreating] = useState(false);

  // 입력창 대화 유도 문구. 스트림으로 받아 오는 대로 채운다. 실패하면 기존 문구를 그대로 둔다.
  const refreshHint = useCallback(async () => {
    try {
      const res = await fetch(`/api/hint?characterSlug=${encodeURIComponent(characterSlug)}`);
      if (!res.ok || !res.body) return;
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let raw = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += value;
        const text = cleanHint(raw);
        if (text) setHint(text);
      }
    } catch (err) {
      console.warn('[hint]', err);
    }
  }, [characterSlug]);
  const setCharacterState = useCharacterStore((s) => s.setState);
  const showEmotion = useCharacterStore((s) => s.showEmotion);
  const stayPut = useCharacterStore((s) => s.stayPut);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: '/api/chat',
        // 히스토리는 서버가 DB에서 읽으므로 마지막 메시지만 보낸다.
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...body,
            conversationId: conversationIdRef.current ?? undefined,
            characterSlug,
            messages: messages.slice(-1),
          },
        }),
      }),
    [characterSlug],
  );

  const { messages, sendMessage, status, error, clearError } = useChat<ChatUIMessage>({
    id: initialConversationId ?? undefined,
    messages: initialMessages,
    transport,
    onFinish: ({ message }) => {
      if (message.metadata?.conversationId) conversationIdRef.current = message.metadata.conversationId;
      const raw = rawText(message);
      setTreating(false);
      showEmotion(message.metadata?.emotion ?? parseEmotion(raw).emotion, holdFor(stripEmotionTag(raw)));
      void refreshHint();
    },
    onError: (err) => {
      setTreating(false);
      console.error('[chat]', err);
      showEmotion('sad', 5_000);
    },
  });

  messagesLengthRef.current = messages.length;
  const last = messages.at(-1);
  const busy = status === 'submitted' || status === 'streaming';
  const streamingText = status === 'streaming' && last?.role === 'assistant' ? stripEmotionTag(rawText(last)) : '';
  const hasStreamedText = streamingText.length > 0;

  // 비유가 먼저 하는 말(재방문 인사·말 걸기)을 스트림으로 받아 말풍선에 채운다. 유저가 먼저 말을 걸면 중단한다.
  const speakFirst = useCallback(
    async (kind: ProactiveKind) => {
      const controller = new AbortController();
      proactiveAbortRef.current = controller;
      const at = messagesLengthRef.current;
      setSpoken({ text: '', at });
      setProactivePending(true);
      clearError();
      setCharacterState('thinking');
      let raw = '';
      try {
        const query = new URLSearchParams({ characterSlug, kind });
        const res = await fetch(`/api/proactive?${query}`, { signal: controller.signal });
        if (!res.ok || !res.body) throw new Error(`${kind} ${res.status}`);
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += value;
          const text = stripEmotionTag(raw);
          if (text) {
            setSpoken({ text, at });
            setCharacterState('talking');
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.warn(`[${kind}]`, err);
      } finally {
        if (proactiveAbortRef.current === controller) proactiveAbortRef.current = null;
        setProactivePending(false);
      }
      // 인사는 실패해도 기본 인사로 대신하고, 말 걸기는 실패하면 조용히 넘어간다.
      const text = stripEmotionTag(raw) || (kind === 'greeting' ? fallbackGreeting : '');
      if (!text) {
        setCharacterState('idle');
        return;
      }
      setSpoken({ text, at });
      showEmotion(raw ? parseEmotion(raw).emotion : 'happy', holdFor(text));
    },
    [characterSlug, clearError, setCharacterState, showEmotion],
  );

  // 처음 들어오면 인사 말풍선을 띄운다.
  useEffect(() => {
    if (returning) void speakFirst('greeting');
    else showEmotion('happy', holdFor(spoken.text));
    void refreshHint();
    return () => proactiveAbortRef.current?.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 조용할 때 말 걸기: 비유가 쉬고 있으면(말풍선이 사라진 뒤) 20~30초 뒤에 먼저 말을 건다.
  // 입력 중이거나 방금 입력했거나 탭이 백그라운드면 다시 미룬다.
  const idle = !busy && !stayPut && !proactivePending;
  useEffect(() => {
    if (!idle || nudgesRef.current >= MAX_NUDGES) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(tick, NUDGE_MIN_MS + Math.random() * (NUDGE_MAX_MS - NUDGE_MIN_MS));
    };
    const tick = () => {
      if (document.hidden || draftRef.current.trim() || Date.now() - lastActivityRef.current < NUDGE_MIN_MS) {
        schedule();
        return;
      }
      nudgesRef.current += 1;
      void speakFirst('nudge');
    };
    schedule();
    return () => clearTimeout(timer);
  }, [idle, speakFirst]);

  /** 유저가 말을 걸거나 간식을 주면: 먼저 하던 말을 멈추고 말 걸기 횟수를 초기화한다. */
  const onUserAction = useCallback(() => {
    proactiveAbortRef.current?.abort();
    setProactivePending(false);
    nudgesRef.current = 0;
    lastActivityRef.current = Date.now();
    clearError();
  }, [clearError]);

  // 전송 → thinking(간식이면 eating), 첫 토큰 → talking. 완료 후 감정 표정은 onFinish에서.
  useEffect(() => {
    const waiting = treating ? 'eating' : 'thinking';
    if (status === 'submitted') setCharacterState(waiting);
    else if (status === 'streaming') setCharacterState(hasStreamedText ? 'talking' : waiting);
  }, [status, hasStreamedText, treating, setCharacterState]);

  // 새 대화의 id는 start 메타데이터로 먼저 도착한다.
  useEffect(() => {
    const id = last?.metadata?.conversationId;
    if (id) conversationIdRef.current = id;
  }, [last?.metadata?.conversationId]);

  // 먼저 한 말 이후로 채팅이 오가지 않았으면 그 말을, 아니면 이번 접속에서 받은 마지막 답을 보여 준다.
  const latestNew = messages.slice(initialMessages.length).findLast((m) => m.role === 'assistant');
  const showSpoken = spoken.at >= messages.length || !latestNew;
  const bubbleText = error ? friendlyError(error) : showSpoken ? spoken.text : stripEmotionTag(rawText(latestNew));
  // 간식을 먹는 동안은 말풍선 없이 모션만 보여 주고, 첫 글자가 오면 말풍선을 띄운다.
  const showBubble = (stayPut || busy) && !(treating && !hasStreamedText);

  return (
    <>
      <Sky />

      {/* 하늘 아래를 가로로 꽉 채우는 풀밭 */}
      <Meadow className="absolute inset-x-0 top-[42%] bottom-0" />

      {/* 비유가 날아다니는 영역: 지평선 위 하늘 ~ 구름 입력창 위 */}
      <div className="absolute inset-x-3 top-[22%] bottom-[calc(env(safe-area-inset-bottom)+150px)]">
        <Character
          scale={5}
          bubble={
            showBubble ? (
              <SpeechBubble
                text={status === 'submitted' ? '' : bubbleText}
                pending={busy ? !hasStreamedText : proactivePending && !spoken.text}
              />
            ) : null
          }
        />
      </div>

      {/* 간식 주기: 로그아웃 버튼(page.tsx, 위에서 0.75rem) 바로 아래 */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+3rem)] right-[calc(env(safe-area-inset-right)+0.75rem)] z-30">
        <TreatButton
          disabled={busy}
          onClick={() => {
            onUserAction();
            setTreating(true);
            setCharacterState('eating');
            // 실제 간식과 기록될 문장은 서버가 정한다. 이 텍스트는 화면용 자리표시.
            void sendMessage({ text: '(간식을 건넸다)' }, { body: { action: 'treat' } });
          }}
        />
      </div>

      {/* 구름 입력창: 모바일 키보드가 올라오면 키보드 높이(--kb)만큼만 위로 올라간다 */}
      <div className="absolute inset-x-0 bottom-0 z-20 translate-y-[calc(-1*var(--kb,0px))] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-5">
        <div className="mx-auto max-w-xl">
          <ChatInput
            disabled={busy}
            maxLength={maxInputChars}
            placeholder={hint ?? `${characterName}에게 말을 걸어 보세요`}
            onDraftChange={(value) => {
              draftRef.current = value;
              lastActivityRef.current = Date.now();
            }}
            onSend={(text) => {
              onUserAction();
              void sendMessage({ text });
            }}
          />
        </div>
      </div>
    </>
  );
}
