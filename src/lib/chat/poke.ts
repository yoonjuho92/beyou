import type { Emotion } from '@/types';

/** 캐릭터를 클릭(탭)했을 때의 짧은 츤데레 반응. LLM 없이 이 중에서 고른다. */
const POKE_LINES: readonly string[] = [
  '뭐?',
  '왜?',
  '…왜 찔러.',
  '흥, 심심해?',
  '할 말 있으면 해.',
  '간지러워. …아, 아니 딱히.',
  '뭐야, 보고 싶었어?',
  '거기 털 정리한 데거든.',
  '…불렀어?',
];

/** 짧은 시간에 연달아 찌르면 나오는 반응 */
const ANNOYED_LINES: readonly string[] = ['그만 좀 찔러!', '자꾸 그러면 화낸다.', '야, 진짜 그만해…', '털 빠진다고!'];

/** 이 시간 안에 이만큼 찌르면 짜증 반응으로 바뀐다 */
const RAPID_WINDOW_MS = 4_000;
const RAPID_COUNT = 4;

function pickOther(lines: readonly string[], previous: string | null): string {
  const pool = lines.filter((l) => l !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 찌른 시각 기록을 받아 이번 반응(대사·표정)을 고른다. 직전 대사는 반복하지 않는다. */
export function pokeReaction(pokeTimes: number[], previous: string | null): { text: string; emotion: Emotion } {
  const now = pokeTimes.at(-1) ?? Date.now();
  const recent = pokeTimes.filter((t) => now - t < RAPID_WINDOW_MS).length;
  if (recent >= RAPID_COUNT) return { text: pickOther(ANNOYED_LINES, previous), emotion: 'surprised' };
  return { text: pickOther(POKE_LINES, previous), emotion: Math.random() < 0.5 ? 'tsundere' : 'surprised' };
}
