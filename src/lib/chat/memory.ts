import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { embedText, toPgVector } from '@/lib/embeddings';
import type { Database } from '@/types/database';

const MIN_TURN_CHARS = 10;

type SaveMemoryInput = {
  /** 유저 세션 클라이언트. RLS(own memories)가 user_id = auth.uid()를 강제한다. */
  supabase: SupabaseClient<Database>;
  userId: string;
  characterId: string;
  characterName: string;
  conversationId: string;
  messageId: string;
  userText: string;
  reply: string;
};

/** 한 턴(유저 발화 + 캐릭터 응답)을 임베딩해 유저별 장기 기억으로 저장한다. */
export async function saveTurnMemory(input: SaveMemoryInput): Promise<void> {
  // 10자 미만 짧은 잡담("ㅎㅇ", "응" 등)은 기억할 가치가 낮아 생략
  if (input.userText.trim().length < MIN_TURN_CHARS) return;

  const content = `유저: ${input.userText.trim()}\n${input.characterName}: ${input.reply.trim()}`;
  const embedding = await embedText(content);
  const { error } = await input.supabase.from('memories').insert({
    user_id: input.userId,
    character_id: input.characterId,
    conversation_id: input.conversationId,
    message_id: input.messageId,
    content,
    embedding: toPgVector(embedding),
  });
  if (error) throw error;
}

/** 이 유저의 과거 대화(memories) 중 하나를 무작위로 고른다. */
export async function randomMemory(supabase: SupabaseClient<Database>, userId: string, characterId: string) {
  const { count, error } = await supabase
    .from('memories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('character_id', characterId);
  if (error) throw error;
  if (!count) return null;

  const offset = Math.floor(Math.random() * count);
  const { data, error: rowError } = await supabase
    .from('memories')
    .select('content, created_at')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .range(offset, offset)
    .maybeSingle();
  if (rowError) throw rowError;
  return data;
}
