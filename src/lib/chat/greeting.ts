import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { streamText } from 'ai';
import { chatModel } from '@/lib/openai';
import { buildSystemPrompt } from '@/lib/prompts';
import type { Database } from '@/types/database';
import { loadUserKnowledge } from './userKnowledge';

const RECENT_MESSAGES = 6;

type Client = SupabaseClient<Database>;

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' });

type GreetingInput = {
  /** 유저 세션 클라이언트 (RLS로 본인 대화·유저 지식만 읽힌다) */
  supabase: Client;
  userId: string;
  character: { id: string; name: string; system_prompt: string; few_shot: string | null };
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

/**
 * 재방문한 유저에게 건넬 인사를 스트리밍으로 만든다.
 * 채팅과 같은 시스템 프롬프트(캐릭터 정의·대화 예시·유저 지식)에 최근 대화를 덧붙여 말투와 맥락을 맞춘다.
 */
export async function streamGreeting({ supabase, userId, character }: GreetingInput) {
  const [userKnowledge, recent] = await Promise.all([
    loadUserKnowledge(supabase, userId, character.id),
    loadRecent(supabase, userId, character.id),
  ]);

  const lastAt = recent.messages.at(-1)?.created_at;
  const situation = [
    '[지금 상황]',
    `유저가 다시 찾아왔습니다. 지금은 ${dateFormat.format(new Date())}${lastAt ? `, 마지막 대화는 ${dateFormat.format(new Date(lastAt))}` : ''}입니다.`,
    '유저가 말을 걸기 전에 먼저 반갑게 인사합니다. 1~2문장으로 짧게.',
    '- [유저 지식]에 이름이 있으면 이름을 부릅니다.',
    '- 유저 지식이나 최근 대화 중 하나를 골라 그 뒤로 어떻게 됐는지 자연스럽게 묻습니다. 여러 개를 나열하지 않습니다.',
    '- 처음 만난 것처럼 자기소개하지 않습니다.',
  ];
  if (recent.messages.length > 0) {
    situation.push(
      '',
      '[최근 대화]',
      ...recent.messages.map((m) => `${m.role === 'user' ? '유저' : character.name}: ${m.content.replace(/\n+/g, ' ')}`),
    );
  }

  const system = `${buildSystemPrompt({ character, userKnowledge, memories: [], summary: null })}\n\n${situation.join('\n')}`;

  return {
    conversationId: recent.conversationId,
    stream: (callbacks: Pick<Parameters<typeof streamText>[0], 'abortSignal' | 'onEnd' | 'onAbort' | 'onError'>) =>
      streamText({
        model: chatModel(),
        system,
        prompt: '(유저가 다시 접속했습니다. 먼저 인사해 주세요.)',
        ...callbacks,
      }),
  };
}
