import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { streamText } from 'ai';
import { chatModel } from '@/lib/openai';
import { buildSystemPrompt, formatMessageTime } from '@/lib/prompts';
import type { Database } from '@/types/database';
import { randomMemory } from './memory';
import { loadUserKnowledge } from './userKnowledge';

/**
 * 유저가 말을 걸기 전에 비유가 먼저 하는 말.
 *   greeting  재방문한 유저에게 건네는 인사
 *   nudge     유저가 한동안 조용할 때 먼저 거는 말 (유저 지식이나 예전 기억에서 화제를 꺼낸다)
 */
export type ProactiveKind = 'greeting' | 'nudge';
export const PROACTIVE_KINDS: readonly ProactiveKind[] = ['greeting', 'nudge'];

const RECENT_MESSAGES = 6;

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
async function loadRecent(supabase: Client, userId: string, characterId: string) {
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
    .limit(RECENT_MESSAGES);
  if (msgError) throw msgError;
  return { conversationId: conversation.id, messages: (data ?? []).reverse() };
}

function situationFor(kind: ProactiveKind, lastAt: string | undefined, memory: { content: string; created_at: string | null } | null) {
  const now = dateFormat.format(new Date());
  if (kind === 'greeting') {
    return [
      '[지금 상황]',
      `유저가 다시 찾아왔습니다. 지금은 ${now}${lastAt ? `, 마지막 대화는 ${dateFormat.format(new Date(lastAt))}` : ''}입니다.`,
      '유저가 말을 걸기 전에 먼저 반갑게 인사합니다. 1~2문장으로 짧게.',
      '- [유저 지식]에 이름이 있으면 이름을 부릅니다.',
      '- 유저 지식이나 최근 대화 중 하나를 골라 그 뒤로 어떻게 됐는지 자연스럽게 묻습니다. 여러 개를 나열하지 않습니다.',
      '- 처음 만난 것처럼 자기소개하지 않습니다.',
    ];
  }
  return [
    '[지금 상황]',
    `유저가 화면을 켜 둔 채 한동안 아무 말이 없습니다. 지금은 ${now}입니다. 비유가 먼저 가볍게 말을 겁니다. 1~2문장으로 짧게.`,
    '- [유저 지식]이나 [떠오른 기억] 중 하나를 골라 화제로 삼습니다. 꼭 직전 대화일 필요는 없습니다.',
    '- 유저에게 부담을 주지 않습니다. 대답을 재촉하거나 "왜 말이 없어요?"라고 묻지 않습니다.',
    '- 혼잣말처럼 몽실계 이야기를 하거나, 유저의 근황·관심사를 궁금해하는 질문도 좋습니다.',
    '- [최근 대화]에서 이미 한 말이나 같은 화제를 되풀이하지 않습니다.',
    ...(memory
      ? ['', `[떠오른 기억] (${dateFormat.format(new Date(memory.created_at ?? Date.now()))})`, memory.content.replace(/\n+/g, ' / ')]
      : []),
  ];
}

/**
 * 먼저 하는 말을 스트리밍으로 만든다.
 * 채팅과 같은 시스템 프롬프트(캐릭터 정의·대화 예시·유저 지식)에 상황 설명과 최근 대화를 덧붙여 말투와 맥락을 맞춘다.
 */
export async function streamProactive({ supabase, userId, character, kind }: ProactiveInput) {
  const [userKnowledge, recent, memory] = await Promise.all([
    loadUserKnowledge(supabase, userId, character.id),
    loadRecent(supabase, userId, character.id),
    kind === 'nudge'
      ? randomMemory(supabase, userId, character.id).catch((err) => {
          console.error('[proactive] random memory failed', err);
          return null;
        })
      : null,
  ]);

  const situation = situationFor(kind, recent.messages.at(-1)?.created_at ?? undefined, memory);
  if (recent.messages.length > 0) {
    situation.push(
      '',
      '[최근 대화]',
      ...recent.messages.map(
        (m) =>
          `[${formatMessageTime(m.created_at ?? new Date())}] ${m.role === 'user' ? '유저' : character.name}: ${m.content.replace(/\n+/g, ' ')}`,
      ),
    );
  }

  const system = `${buildSystemPrompt({ character, userKnowledge, memories: [], summary: null })}\n\n${situation.join('\n')}`;
  const prompt =
    kind === 'greeting' ? '(유저가 다시 접속했습니다. 먼저 인사해 주세요.)' : '(유저가 조용합니다. 먼저 말을 걸어 주세요.)';

  return {
    conversationId: recent.conversationId,
    stream: (callbacks: Pick<Parameters<typeof streamText>[0], 'abortSignal' | 'onEnd' | 'onAbort' | 'onError'>) =>
      streamText({ model: chatModel(), system, prompt, ...callbacks }),
  };
}
