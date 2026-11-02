/** 간식 주기: 간식(당근) 턴의 유저 메시지와 LLM 지시문을 만든다. */

/** 간식은 당근 하나뿐이다. 화면의 먹는 모션(llama/faces.ts CARROT)도 당근으로 그린다. */
export const TREAT = '당근';

/** 받침이 있으면 '을', 없으면 '를' */
function objectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return '를';
  return code % 28 === 0 ? '를' : '을';
}

/** DB와 히스토리에 남는 유저 쪽 메시지 */
export function treatMessage(treat: string): string {
  return `(간식으로 ${treat}${objectParticle(treat)} 건넸다)`;
}

/** 시스템 프롬프트 끝에 붙이는 상황 설명 */
export function treatInstruction(treat: string): string {
  return [
    '[지금 상황]',
    `유저가 방금 간식으로 ${treat}${objectParticle(treat)} 줬습니다. 맛을 보고 아주 기뻐하며 고마움을 표현합니다.`,
    '- 처음 먹어 보는 맛에 대한 감상이나 몽실계 음식(솜사탕 풀 등)과의 비교를 짧게 곁들여도 좋습니다.',
    '- 기분이 좋아 조금 더 높이 떠오르거나 꼬리를 흔드는 행동 묘사를 한 번 넣을 수 있습니다.',
    '- 감정 태그는 [emotion:happy]를 씁니다.',
  ].join('\n');
}
