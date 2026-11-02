import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { streamText } from 'ai';
import { serverEnv } from '@/lib/env.server';
import { HINT_MAX_CHARS } from '@/lib/hintText';
import { chatModel } from '@/lib/openai';
import type { Database } from '@/types/database';
import { randomMemory } from './memory';
import { loadUserKnowledge } from './userKnowledge';

/** 과거 대화가 있어도 가끔은 설정만으로 만들어 문구가 한쪽으로 쏠리지 않게 한다. */
const MEMORY_RATIO = 0.5;

type Client = SupabaseClient<Database>;

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });

function hintPrompt(characterName: string, systemPrompt: string) {
  return [
    `채팅 앱 입력창의 안내 문구(placeholder)를 만든다. 유저가 캐릭터 '${characterName}'에게 건넬 법한 말을 유저 입장에서 한 문장으로 쓴다.`,
    '',
    '규칙:',
    `- ${HINT_MAX_CHARS - 10}자 안팎의 한 문장. 친근한 반말. 따옴표·이모지·설명 없이 문장만 출력한다.`,
    '- [지난 대화]가 있으면 그 이야기를 이어 가거나 근황을 전하는 말을 만든다.',
    `- 없으면 [${characterName} 설정]의 구체적인 소재(고향, 좋아하는 것, 버릇 등)를 궁금해하는 질문을 만든다.`,
    '- [유저 지식]은 자연스러울 때만 활용한다.',
    `- 예: "${characterName}야, 몽실계에도 비가 와?", "오늘 드디어 시험 끝났어!"`,
    '',
    `[${characterName} 설정]`,
    systemPrompt,
  ].join('\n');
}

type HintInput = {
  /** 유저 세션 클라이언트 (RLS로 본인 기억·유저 지식만 읽힌다) */
  supabase: Client;
  userId: string;
  character: { id: string; name: string; system_prompt: string };
};

/**
 * 과거 대화 또는 캐릭터 설정을 바탕으로 대화 유도 문구를 스트리밍으로 만든다.
 * 군더더기 정리(cleanHint)는 받는 쪽에서 한다.
 */
export async function streamHint({ supabase, userId, character }: HintInput) {
  const env = serverEnv();
  const [memory, userKnowledge] = await Promise.all([
    Math.random() < MEMORY_RATIO
      ? randomMemory(supabase, userId, character.id).catch((err) => {
          console.error('[hint] random memory failed', err);
          return null;
        })
      : null,
    loadUserKnowledge(supabase, userId, character.id),
  ]);

  const context = [
    userKnowledge ? `[유저 지식]\n${userKnowledge}` : null,
    memory ? `[지난 대화] (${dateFormat.format(new Date(memory.created_at ?? Date.now()))})\n${memory.content}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  return streamText({
    model: chatModel(env.OPENAI_UTILITY_MODEL),
    system: hintPrompt(character.name, character.system_prompt),
    prompt: context || '참고할 지난 대화 없음. 설정을 바탕으로 만들어 줘.',
    onError: ({ error }) => console.error('[hint] stream error', error),
  });
}
