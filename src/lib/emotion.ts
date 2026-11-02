import { EMOTIONS, type Emotion } from '@/types';

const TAG = /\[\s*emotion\s*:\s*([a-z|]+)\s*\]/gi;
// 스트리밍 중 끝에 걸린 미완성 태그 ("[emo", "[emotion:ha" 등)
const PARTIAL_TAG_AT_END = /\[\s*(e(m(o(t(i(o(n(\s*:\s*[a-z|]*)?)?)?)?)?)?)?)?\s*$/i;

function toEmotion(raw: string): Emotion {
  const value = raw.toLowerCase();
  return (EMOTIONS as readonly string[]).includes(value) ? (value as Emotion) : 'neutral';
}

/** 응답에서 마지막 [emotion:*] 태그를 감정으로 추출하고, 모든 태그를 본문에서 제거한다. */
export function parseEmotion(text: string): { content: string; emotion: Emotion } {
  const matches = [...text.matchAll(TAG)];
  const last = matches.at(-1);
  return {
    content: stripEmotionTag(text),
    emotion: last ? toEmotion(last[1]) : 'neutral',
  };
}

/** 화면 표시용: 완성된 태그와, 스트리밍 중 끝에 걸린 미완성 태그를 모두 숨긴다. */
export function stripEmotionTag(text: string): string {
  return text.replace(TAG, '').replace(PARTIAL_TAG_AT_END, '').trimEnd();
}
