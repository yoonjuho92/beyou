import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type CharacterInput = {
  slug: string;
  name: string;
  description?: string | null;
  systemPrompt: string;
  /** 대화 예시 (characters/<slug>/fewshot.md 본문). 없으면 null */
  fewShot?: string | null;
};

/**
 * 캐릭터 정의를 slug 기준으로 upsert한다.
 * system.md 본문(설정 포함) 전체가 system_prompt, fewshot.md 본문이 few_shot이 된다.
 */
export async function upsertCharacter({ slug, name, description, systemPrompt, fewShot }: CharacterInput): Promise<string> {
  if (!systemPrompt.trim()) throw new Error(`system prompt가 비어 있습니다: ${slug}`);
  const { data, error } = await createAdminClient()
    .from('characters')
    .upsert(
      {
        slug,
        name,
        description: description ?? null,
        system_prompt: systemPrompt.trim(),
        few_shot: fewShot?.trim() || null,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}
