import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env.server';
import { countTokens } from '@/lib/tokens';
import type { Database } from '@/types/database';

export type MemoryHit = { id: string; content: string; createdAt: string; similarity: number };

type SearchParams = {
  /** 반드시 유저 세션 클라이언트. match_memories가 auth.uid()로 본인 기억만 검색한다. */
  supabase: SupabaseClient<Database>;
  characterId: string;
  /** toPgVector()로 변환한 질의 임베딩 */
  queryEmbedding: string;
};

/** 유사도가 낮은 것부터 잘라 총 토큰을 maxTokens 이하로 맞춘다. */
export function fitToTokenBudget<T extends { content: string; similarity: number }>(hits: T[], maxTokens: number): T[] {
  const kept = new Set<T>();
  let used = 0;
  for (const hit of [...hits].sort((a, b) => b.similarity - a.similarity)) {
    const tokens = countTokens(hit.content);
    if (used + tokens > maxTokens) continue;
    kept.add(hit);
    used += tokens;
  }
  return hits.filter((h) => kept.has(h));
}

/** 과거 기억 벡터 검색. 최근 구간이 걸러질 몫만큼 여유 있게 받아 둔다. */
export async function searchMemories({ supabase, characterId, queryEmbedding }: SearchParams): Promise<MemoryHit[]> {
  const env = serverEnv();
  const { data, error } = await supabase.rpc('match_memories', {
    query_embedding: queryEmbedding,
    p_character_id: characterId,
    match_count: env.RAG_MEMORY_TOP_K + Math.ceil(env.CHAT_HISTORY_LIMIT / 2),
    match_threshold: env.RAG_MEMORY_THRESHOLD,
  });

  // 검색 실패는 대화를 막지 않는다. 로그만 남기고 빈 컨텍스트로 진행.
  if (error) console.error('[rag] match_memories failed', error);

  return (data ?? []).map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    similarity: r.similarity,
  }));
}

type SelectOptions = {
  /**
   * 이 시각 이후에 만들어진 기억은 제외한다. 프롬프트에 이미 들어가는 최근 히스토리 구간(가장 오래된 메시지 시각)을 넘긴다.
   * 대화를 계속 이어 쓰는 구조라 "현재 대화 전체"를 빼면 기억이 영영 검색되지 않으므로, 겹치는 구간만 뺀다.
   */
  excludeSince: string | null;
  topK: number;
  maxTokens: number;
};

/** 히스토리와 겹치는 기억을 빼고, 토큰 상한에 맞춰 유사도 낮은 것부터 잘라낸다. */
export function selectMemories(found: MemoryHit[], { excludeSince, topK, maxTokens }: SelectOptions): MemoryHit[] {
  const cutoff = excludeSince ? new Date(excludeSince).getTime() : Infinity;
  const memories = found.filter((m) => new Date(m.createdAt).getTime() < cutoff).slice(0, topK);
  return fitToTokenBudget(memories, maxTokens);
}
