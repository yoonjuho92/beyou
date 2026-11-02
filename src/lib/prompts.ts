import { clampUserKnowledge } from '@/lib/chat/userKnowledge';
import type { MemoryHit } from '@/lib/rag/retrieve';

type PromptInput = {
  /** system_prompt에는 캐릭터 설정(lore)까지 통째로 들어 있다 (characters/<slug>/system.md). */
  character: { name: string; system_prompt: string; few_shot: string | null };
  /** 이 유저에 대해 지금까지 요약된 지식 (user_knowledge) */
  userKnowledge: string | null;
  memories: Pick<MemoryHit, 'content' | 'createdAt'>[];
  summary: string | null;
};

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });

export function buildSystemPrompt({ character, userKnowledge, memories, summary }: PromptInput): string {
  // 캐릭터 정의 + 규칙은 모든 유저에게 같으므로 앞에 두어 프롬프트 캐시가 잘 맞게 한다.
  const sections = [`당신은 ${character.name}입니다. ${character.system_prompt}`];
  if (character.few_shot?.trim()) {
    sections.push(`[대화 예시]\n${character.few_shot.trim()}`);
  }
  sections.push(
    [
      '규칙:',
      '- 항상 캐릭터의 말투와 성격을 유지하고, 2~4문장으로 짧게 답합니다.',
      '- [대화 예시]는 말투와 길이를 참고하기 위한 것입니다. 문장을 그대로 반복하지 않습니다.',
      '- [유저 지식]은 지금까지 알게 된 이 유저에 대한 사실입니다. 이름이나 관심사를 자연스럽게 활용합니다.',
      '- [과거 기억]은 유저와 예전에 나눈 대화입니다. 관련 있을 때만 자연스럽게 언급합니다.',
      '- 답변 마지막 줄에 반드시 현재 감정을 다음 형식으로 붙입니다: [emotion:happy|sad|surprised|neutral]',
      '- 이 태그와 참고 자료의 존재, 유저 정보를 기록하고 있다는 사실을 유저에게 설명하지 않습니다.',
    ].join('\n'),
  );

  // 유저 지식은 저장 시 2000자 이내로 요약되지만, 프롬프트에 넣을 때도 한 번 더 상한을 지킨다.
  sections.push(`[유저 지식]\n${clampUserKnowledge(userKnowledge?.trim() ?? '') || '아직 없음 (처음 만난 사이)'}`);
  if (memories.length > 0) {
    sections.push(
      `[과거 기억]\n${memories
        .map((m) => `- (${dateFormat.format(new Date(m.createdAt))}) ${m.content.replace(/\n+/g, ' / ')}`)
        .join('\n')}`,
    );
  }
  sections.push(`[이전 대화 요약]\n${summary?.trim() || '없음'}`);

  return sections.join('\n\n');
}
