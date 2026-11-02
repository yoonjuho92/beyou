import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { streamText } from 'ai';
import { serverEnv } from '@/lib/env.server';
import { HINT_TARGET_CHARS } from '@/lib/hintText';
import { chatModel } from '@/lib/openai';
import type { Database } from '@/types/database';
import { randomMemory } from './memory';
import { loadUserKnowledge } from './userKnowledge';

/** 과거 대화가 있어도 가끔은 설정만으로 만들어 문구가 한쪽으로 쏠리지 않게 한다. */
const MEMORY_RATIO = 0.5;

type Client = SupabaseClient<Database>;

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });

/**
 * 역할은 "유저의 말을 대신 써 주는 추천기"로만 둔다. 캐릭터 설정은 system이 아니라 참고 자료로 감싸서 넣는다
 * (설정 본문이 "당신은 비유입니다"로 시작해, system에 넣으면 모델이 비유가 되어 비유의 말을 쓰곤 했다).
 */
function hintPrompt(characterName: string) {
  return [
    `너는 채팅 앱의 입력 추천기다. 사람(유저)이 캐릭터 '${characterName}'에게 보낼 메시지를 유저 대신 한 문장 써 준다.`,
    `너는 ${characterName}가 아니다. ${characterName}의 대사를 쓰면 안 된다.`,
    '',
    '규칙:',
    `- 유저 1인칭, ${characterName}에게 말하는 친근한 반말. ${HINT_TARGET_CHARS}자 안팎 한 문장. 따옴표·이모지·괄호·설명 없이 문장만.`,
    `- [${characterName}의 마지막 말]이 있으면 거기에 유저가 답하는 말을 우선으로 만든다.`,
    '- 아니면 [지난 대화]를 이어 가거나 근황을 전하는 말, 또는 캐릭터 설정의 소재(고향, 좋아하는 것 등)를 궁금해하는 질문.',
    '- [유저 지식]은 자연스러울 때만 활용한다.',
    `- 좋은 예: "${characterName}야, 몽실계에도 비가 와?" / "오늘 드디어 시험 끝났어!" / "포근이는 어떤 양이야?"`,
    `- 나쁜 예(${characterName}의 말이라 안 됨): "저는 몽실계에서 왔어요" / "오늘 하루는 어땠어요?" / "(꼬리 살랑) 반가워요"`,
  ].join('\n');
}

/** 이 유저의 최근 대화에서 캐릭터가 마지막으로 한 말 */
async function lastCharacterLine(supabase: Client, userId: string, characterId: string): Promise<string | null> {
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!conversation) return null;
  const { data } = await supabase
    .from('messages')
    .select('content')
    .eq('conversation_id', conversation.id)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.content ?? null;
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
  const [memory, userKnowledge, lastLine] = await Promise.all([
    Math.random() < MEMORY_RATIO
      ? randomMemory(supabase, userId, character.id).catch((err) => {
          console.error('[hint] random memory failed', err);
          return null;
        })
      : null,
    loadUserKnowledge(supabase, userId, character.id),
    lastCharacterLine(supabase, userId, character.id).catch(() => null),
  ]);

  const context = [
    `[참고: ${character.name} 캐릭터 설정 — 너의 역할이 아니라 대화 상대에 대한 설명이다]\n${character.system_prompt}`,
    lastLine ? `[${character.name}의 마지막 말]\n${lastLine.replace(/\[emotion:[^\]]*\]/gi, '').trim()}` : null,
    userKnowledge ? `[유저 지식]\n${userKnowledge}` : null,
    memory ? `[지난 대화] (${dateFormat.format(new Date(memory.created_at ?? Date.now()))})\n${memory.content}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  return streamText({
    model: chatModel(env.OPENAI_UTILITY_MODEL),
    system: hintPrompt(character.name),
    prompt: `${context}\n\n유저가 ${character.name}에게 보낼 한 문장:`,
    onError: ({ error }) => console.error('[hint] stream error', error),
  });
}
