/** 모델에게 요청하는 추천 문구 길이 */
export const HINT_TARGET_CHARS = 30;
/** 그래도 길게 나오면 여기서 자른다 (문장이 중간에 끊기지 않도록 목표보다 넉넉하게) */
export const HINT_MAX_CHARS = 60;

/**
 * 추천 문구가 캐릭터(비유) 쪽 말투로 새어 나왔는지. 추천 문구는 유저가 비유에게 하는 반말이어야 한다.
 * 비유의 말버릇(뿌우), 행동 묘사 괄호, 비유의 자기 지칭(저는/제가), 유저를 부르는 "당신", 해요체 어미를 잡는다.
 */
export function looksLikeCharacterLine(text: string): boolean {
  return (
    /뿌우|[()（）]|당신|인간들|몽실계에서 (왔|온)/.test(text) ||
    /(^|\s)(저는|제가|저도|저를|제)\s/.test(text) ||
    /(요|니다|세요)[.!?~…\s]*$/.test(text)
  );
}

/** 따옴표·줄바꿈 등 LLM이 붙인 군더더기를 걷어 낸다. 스트리밍 중인 부분 문자열에도 쓸 수 있다. */
export function cleanHint(text: string): string {
  const line = text.trimStart().split('\n')[0] ?? '';
  return line
    .replace(/^[-*\d.\s]+/, '')
    .replace(/^["'“”‘’「」]+|["'“”‘’「」]+$/g, '')
    .trim()
    .slice(0, HINT_MAX_CHARS);
}
