export const HINT_MAX_CHARS = 40;

/** 따옴표·줄바꿈 등 LLM이 붙인 군더더기를 걷어 낸다. 스트리밍 중인 부분 문자열에도 쓸 수 있다. */
export function cleanHint(text: string): string {
  const line = text.trimStart().split('\n')[0] ?? '';
  return line
    .replace(/^[-*\d.\s]+/, '')
    .replace(/^["'“”‘’「」]+|["'“”‘’「」]+$/g, '')
    .trim()
    .slice(0, HINT_MAX_CHARS);
}
