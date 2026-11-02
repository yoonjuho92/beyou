import { streamHint } from '@/lib/chat/hint';
import { checkChatRateLimit } from '@/lib/rateLimit';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

/** GET /api/hint?characterSlug=beyou → 입력창 대화 유도 문구를 text/plain 스트림으로 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const slug = new URL(req.url).searchParams.get('characterSlug');
  if (!slug || slug.length > 64) return Response.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 });

  // 채팅과 별도 버킷으로 센다.
  const rate = await checkChatRateLimit(`hint:${userId}`);
  if (!rate.ok) return new Response(null, { status: 429 });

  try {
    const { data: character, error } = await supabase
      .from('characters')
      .select('id, name, system_prompt')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!character) return Response.json({ error: '캐릭터를 찾을 수 없어요.' }, { status: 404 });

    const result = await streamHint({ supabase, userId, character });
    return result.toTextStreamResponse({ headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[hint] failed', err);
    return new Response(null, { status: 500 });
  }
}
