import { after } from 'next/server';
import { PROACTIVE_KINDS, streamProactive, type ProactiveKind } from '@/lib/chat/proactive';
import { parseEmotion } from '@/lib/emotion';
import { checkChatRateLimit } from '@/lib/rateLimit';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

/**
 * GET /api/proactive?characterSlug=beyou&kind=greeting|nudge
 * → 비유가 먼저 하는 말(재방문 인사 / 조용할 때 말 걸기)을 text/plain 스트림으로 ([emotion:*] 태그 포함).
 * 다 만들어진 말은 최근 대화에 assistant 메시지로 저장해, 유저의 다음 답장이 맥락을 잃지 않게 한다.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const slug = params.get('characterSlug');
  const kind = params.get('kind') as ProactiveKind | null;
  if (!slug || slug.length > 64 || !kind || !PROACTIVE_KINDS.includes(kind)) {
    return Response.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 });
  }

  const rate = await checkChatRateLimit(`proactive:${userId}`);
  if (!rate.ok) return new Response(null, { status: 429 });

  try {
    const { data: character, error } = await supabase
      .from('characters')
      .select('id, name, system_prompt, few_shot')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!character) return Response.json({ error: '캐릭터를 찾을 수 없어요.' }, { status: 404 });

    const proactive = await streamProactive({ supabase, userId, character, kind });

    let resolveText!: (text: string | null) => void;
    const done = new Promise<string | null>((resolve) => (resolveText = resolve));
    after(async () => {
      const text = await done;
      if (!text || !proactive.conversationId) return;
      const parsed = parseEmotion(text);
      const { error: saveError } = await supabase.from('messages').insert({
        conversation_id: proactive.conversationId,
        role: 'assistant',
        content: parsed.content,
        emotion: parsed.emotion,
      });
      if (saveError) console.error(`[proactive:${kind}] failed to save`, saveError);
    });

    const result = proactive.stream({
      // 클라이언트가 끊으면(유저가 먼저 말을 걸었거나 페이지를 떠남) 생성도 멈추고 저장하지 않는다.
      abortSignal: req.signal,
      onEnd: ({ text }) => resolveText(text),
      onAbort: () => resolveText(null),
      onError: ({ error: streamError }) => {
        console.error(`[proactive:${kind}] stream error`, streamError);
        resolveText(null);
      },
    });
    return result.toTextStreamResponse({ headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error(`[proactive:${kind}] failed`, err);
    return new Response(null, { status: 500 });
  }
}
