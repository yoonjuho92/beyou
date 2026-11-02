/** 간식 주기: 간식 턴의 유저 메시지와 LLM 지시문을 만든다. 클라이언트(버튼·먹는 모션)와 서버가 함께 쓴다. */

export const TREAT_IDS = ['carrot', 'dandelion'] as const;
export type TreatId = (typeof TREAT_IDS)[number];

/** 간식마다 이름과 맛 힌트. 먹는 모션은 llama/faces.ts의 TREAT_PIECES, 버튼 아이콘은 llama/treatIcons.ts. */
export const TREATS: Record<TreatId, { name: string; taste: string }> = {
  carrot: { name: '당근', taste: '아삭하고 달콤한 맛' },
  dandelion: { name: '민들레 잎', taste: '살짝 쌉쌀하면서 풀 향이 진한 맛. 풀밭에서 자라는 잎이라 비유가 특히 반가워한다' },
};

/** 받침이 있으면 '을', 없으면 '를' */
function objectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return '를';
  return code % 28 === 0 ? '를' : '을';
}

/** DB와 히스토리에 남는 유저 쪽 메시지 */
export function treatMessage(id: TreatId): string {
  const { name } = TREATS[id];
  return `(간식으로 ${name}${objectParticle(name)} 건넸다)`;
}

/** 시스템 프롬프트 끝에 붙이는 상황 설명 */
export function treatInstruction(id: TreatId): string {
  const { name, taste } = TREATS[id];
  return [
    '[지금 상황]',
    `유저가 방금 간식으로 ${name}${objectParticle(name)} 줬습니다. 시큰둥한 척하면서 먹지만 사실은 꽤 좋아합니다. 고맙다는 말은 툭 던지듯 짧게.`,
    `- 맛: ${taste}.`,
    '- 처음 먹어 보는 맛에 대한 감상이나 몽실계 음식(솜사탕 풀 등)과의 비교를 짧게 곁들여도 좋습니다.',
    '- 좋아하는 티가 살짝 새어 나오게 합니다 (예: "뭐… 나쁘지 않네. 하나 더 있어?").',
    '- 감정 태그는 [emotion:tsundere]를 씁니다.',
  ].join('\n');
}
