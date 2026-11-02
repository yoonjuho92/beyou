import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateText, streamText } from 'ai';
import { serverEnv } from '@/lib/env.server';
import { chatModel } from '@/lib/openai';
import { buildSystemPrompt, formatMessageTime } from '@/lib/prompts';
import type { Database } from '@/types/database';
import { randomMemory } from './memory';
import { loadUserKnowledge } from './userKnowledge';

/**
 * 유저가 말을 걸기 전에 비유가 먼저 하는 말.
 *   greeting  재방문한 유저에게 건네는 인사
 *   nudge     유저가 한동안 조용할 때 먼저 거는 말. 최근 대화와 겹치지 않는 새 화제를 먼저 고른 뒤 그 화제로만 말한다.
 */
export type ProactiveKind = 'greeting' | 'nudge';
export const PROACTIVE_KINDS: readonly ProactiveKind[] = ['greeting', 'nudge'];

/** 인사·말 걸기 프롬프트에 넣는 최근 대화 수 */
const RECENT_MESSAGES = 6;
/** 말 걸기 화제를 고를 때 "이미 나온 화제"로 보는 최근 메시지 수 (이전 말 걸기 포함) */
const TOPIC_HISTORY = 20;

/** 말 걸기 화제의 출처. 매번 무작위로 하나를 골라 화제가 한쪽으로 쏠리지 않게 한다. */
const TOPIC_SOURCES = {
  user: '유저 지식에 있는 유저의 일·관심사·고민 중 하나 (근황을 묻는다)',
  memory: '[떠오른 기억]에 나온 예전 이야기 (그 뒤로 어떻게 됐는지 묻거나 이어 간다)',
  mongsil: '캐릭터 설정에 있는 몽실계·비유 자신의 이야기 (친구, 고향 풍경, 좋아하는 것 등)',
  human: '비유가 이 세계(인간 세계)에서 처음 보고 신기해할 만한 일상 사물이나 습관 (예: 우산, 엘리베이터, 알람 시계)',
} as const;
type TopicSource = keyof typeof TOPIC_SOURCES;

type Client = SupabaseClient<Database>;

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' });

type ProactiveInput = {
  /** 유저 세션 클라이언트 (RLS로 본인 대화·기억·유저 지식만 읽힌다) */
  supabase: Client;
  userId: string;
  character: { id: string; name: string; system_prompt: string; few_shot: string | null };
  kind: ProactiveKind;
};

/** 최근 대화 id와 마지막 메시지 몇 개 (오래된 것부터) */
async function loadRecent(supabase: Client, userId: string, characterId: string, limit: number) {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!conversation) return { conversationId: null, messages: [] };

  const { data, error: msgError } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversation.id)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (msgError) throw msgError;
  return { conversationId: conversation.id, messages: (data ?? []).reverse() };
}

type Memory = { content: string; created_at: string | null };
type RecentMessage = { role: string; content: string; created_at: string | null };

function transcript(messages: RecentMessage[], characterName: string): string[] {
  return messages.map(
    (m) =>
      `[${formatMessageTime(m.created_at ?? new Date())}] ${m.role === 'user' ? '유저' : characterName}: ${m.content.replace(/\n+/g, ' ')}`,
  );
}

function memoryLines(memory: Memory): string[] {
  return [`[떠오른 기억] (${dateFormat.format(new Date(memory.created_at ?? Date.now()))})`, memory.content.replace(/\n+/g, ' / ')];
}

/**
 * 말 걸기 화제를 고른다. 출처를 무작위로 정하고, 보조 모델이 [최근 대화]와 겹치지 않는 화제 하나를 한 줄로 고른다.
 * 실패하면 null (화제 지정 없이 말을 건다).
 */
async function pickTopic(input: {
  character: { name: string; system_prompt: string };
  userKnowledge: string | null;
  memory: Memory | null;
  recent: RecentMessage[];
}): Promise<string | null> {
  const sources = (Object.keys(TOPIC_SOURCES) as TopicSource[]).filter(
    (s) => (s !== 'user' || input.userKnowledge) && (s !== 'memory' || input.memory),
  );
  const source = sources[Math.floor(Math.random() * sources.length)];

  const material = [
    source === 'user' && input.userKnowledge ? `[유저 지식]\n${input.userKnowledge}` : null,
    source === 'memory' && input.memory ? memoryLines(input.memory).join('\n') : null,
    source === 'mongsil' ? `[캐릭터 설정]\n${input.character.system_prompt}` : null,
  ].filter(Boolean);

  try {
    const { text } = await generateText({
      model: chatModel(serverEnv().OPENAI_UTILITY_MODEL),
      system: [
        `캐릭터 '${input.character.name}'가 조용한 유저에게 먼저 꺼낼 새 화제를 하나 고른다.`,
        `- 화제 출처: ${TOPIC_SOURCES[source]}`,
        '- [최근 대화]에 이미 나온 화제와 반드시 달라야 한다. 같은 대상·같은 사건·비슷한 질문, 표현만 바꾼 것도 같은 화제로 본다.',
        '- 화제만 20자 안팎의 명사구 한 줄로 출력한다. 따옴표·설명 없이.',
      ].join('\n'),
      prompt: [
        ...material,
        `[최근 대화]\n${input.recent.length > 0 ? transcript(input.recent, input.character.name).join('\n') : '없음'}`,
      ].join('\n\n'),
    });
    const topic = text.trim().split('\n')[0]?.replace(/^["'“”\-\s]+|["'“”\s]+$/g, '').trim();
    return topic || null;
  } catch (err) {
    console.error('[proactive] topic pick failed', err);
    return null;
  }
}

function situationFor(kind: ProactiveKind, lastAt: string | undefined, memory: Memory | null, topic: string | null) {
  const now = dateFormat.format(new Date());
  if (kind === 'greeting') {
    return [
      '[지금 상황]',
      `유저가 다시 찾아왔습니다. 지금은 ${now}${lastAt ? `, 마지막 대화는 ${dateFormat.format(new Date(lastAt))}` : ''}입니다.`,
      '유저가 말을 걸기 전에 먼저 인사합니다. 반가운 티는 대놓고 내지 않고 무심하게 툭. 1~2문장으로 짧게.',
      '- [유저 지식]에 이름이 있으면 이름을 부릅니다.',
      '- 유저 지식이나 최근 대화 중 하나를 골라 그 뒤로 어떻게 됐는지 자연스럽게 묻습니다. 여러 개를 나열하지 않습니다.',
      '- 처음 만난 것처럼 자기소개하지 않습니다.',
    ];
  }
  return [
    '[지금 상황]',
    `유저가 화면을 켜 둔 채 한동안 아무 말이 없습니다. 지금은 ${now}입니다. 비유가 먼저 가볍게 말을 겁니다. 1~2문장으로 짧게.`,
    ...(topic
      ? [`- 이번 화제는 "${topic}"입니다. 반드시 이 화제로만 말을 겁니다.`]
      : ['- [유저 지식]이나 [떠오른 기억], 몽실계 이야기 중 하나를 골라 화제로 삼습니다.']),
    '- [최근 대화]에 나온 화제(이전에 먼저 말을 걸었던 화제 포함)는 절대 다시 꺼내지 않습니다. 이어서 묻지도 않습니다.',
    '- 유저에게 부담을 주지 않습니다. 대답을 재촉하거나 "왜 말이 없어요?"라고 묻지 않습니다.',
    ...(memory && !topic ? ['', ...memoryLines(memory)] : []),
  ];
}

/**
 * 먼저 하는 말을 스트리밍으로 만든다.
 * 채팅과 같은 시스템 프롬프트(캐릭터 정의·대화 예시·유저 지식)에 상황 설명과 최근 대화를 덧붙여 말투와 맥락을 맞춘다.
 */
export async function streamProactive({ supabase, userId, character, kind }: ProactiveInput) {
  const [userKnowledge, recent, memory] = await Promise.all([
    loadUserKnowledge(supabase, userId, character.id),
    loadRecent(supabase, userId, character.id, kind === 'nudge' ? TOPIC_HISTORY : RECENT_MESSAGES),
    kind === 'nudge'
      ? randomMemory(supabase, userId, character.id).catch((err) => {
          console.error('[proactive] random memory failed', err);
          return null;
        })
      : null,
  ]);

  // 말 걸기: 최근 20개 메시지와 겹치지 않는 화제를 먼저 고른다. 말을 만들 때는 말투·맥락용으로 최근 6개만 보여 준다.
  const topic = kind === 'nudge' ? await pickTopic({ character, userKnowledge, memory, recent: recent.messages }) : null;
  if (topic) console.info(`[proactive] nudge topic: ${topic}`);

  const situation = situationFor(kind, recent.messages.at(-1)?.created_at ?? undefined, memory, topic);
  const shown = recent.messages.slice(-RECENT_MESSAGES);
  if (shown.length > 0) situation.push('', '[최근 대화]', ...transcript(shown, character.name));

  const system = `${buildSystemPrompt({ character, userKnowledge, memories: [], summary: null })}\n\n${situation.join('\n')}`;
  const prompt =
    kind === 'greeting' ? '(유저가 다시 접속했습니다. 먼저 인사해 주세요.)' : '(유저가 조용합니다. 먼저 말을 걸어 주세요.)';

  return {
    conversationId: recent.conversationId,
    stream: (callbacks: Pick<Parameters<typeof streamText>[0], 'abortSignal' | 'onEnd' | 'onAbort' | 'onError'>) =>
      streamText({ model: chatModel(), system, prompt, ...callbacks }),
  };
}
