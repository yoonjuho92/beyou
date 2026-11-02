import { createUIMessageStream, createUIMessageStreamResponse, streamText, type ModelMessage } from 'ai';
import { after } from 'next/server';
import { z } from 'zod';
import { saveTurnMemory } from '@/lib/chat/memory';
import { TREAT_IDS, treatInstruction, treatMessage } from '@/lib/chat/treat';
import { loadUserKnowledge, updateUserKnowledge } from '@/lib/chat/userKnowledge';
import { embedText, toPgVector } from '@/lib/embeddings';
import { parseEmotion } from '@/lib/emotion';
import { serverEnv } from '@/lib/env.server';
import { chatModel } from '@/lib/openai';
import { buildSystemPrompt, withTime } from '@/lib/prompts';
import { searchMemories, selectMemories } from '@/lib/rag/retrieve';
import { checkChatRateLimit } from '@/lib/rateLimit';
import { createClient } from '@/lib/supabase/server';
import type { ChatUIMessage } from '@/types';
import type { Json } from '@/types/database';

export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.uuid().optional(),
  characterSlug: z.string().min(1).max(64),
  /** treat: 간식 주기. 클라이언트가 보낸 텍스트 대신 서버가 간식 턴을 만든다. */
  action: z.enum(['treat']).optional(),
  /** 어떤 간식인지 (action이 treat일 때). 생략하면 당근 */
  treat: z.enum(TREAT_IDS).optional(),
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
        parts: z.array(z.looseObject({ type: z.string() })),
      }),
    )
    .min(1),
});

function jsonError(status: number, message: string, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

function textOf(message: { parts: { type: string; text?: unknown }[] }): string {
  return message.parts
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')
    .trim();
}

type Turn = { text: string; usage: unknown } | null;

export async function POST(req: Request) {
  const env = serverEnv();

  // 1. 세션 확인
  const supabase = await createClient();
  // getClaims()는 JWT를 로컬에서 검증한다 (비대칭 서명 키 기준, 네트워크 왕복 없음).
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return jsonError(401, '로그인이 필요해요.');

  // 입력 검증
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    console.warn('[chat] invalid body', err);
    return jsonError(400, '요청 형식이 올바르지 않아요.');
  }
  const last = body.messages.at(-1)!;
  const treat = body.action === 'treat' ? (body.treat ?? 'carrot') : null;
  const userText = treat ? treatMessage(treat) : last.role === 'user' ? textOf(last) : '';
  if (!userText) return jsonError(400, '메시지를 입력해 주세요.');
  if (userText.length > env.CHAT_MAX_INPUT_CHARS) {
    return jsonError(413, `메시지는 ${env.CHAT_MAX_INPUT_CHARS}자까지 보낼 수 있어요.`);
  }

  const rate = await checkChatRateLimit(userId);
  if (!rate.ok) {
    return jsonError(429, '조금 천천히 말해 주세요. 잠시 후 다시 시도해 주세요.', {
      'Retry-After': String(rate.retryAfterSec),
    });
  }

  try {
    // 2~3. 캐릭터 조회 · 기존 대화 확인 · 질의 임베딩을 동시에
    const [characterRes, existingRes, queryEmbedding] = await Promise.all([
      supabase.from('characters').select('id, name, system_prompt, few_shot').eq('slug', body.characterSlug).maybeSingle(),
      body.conversationId
        ? supabase
            .from('conversations')
            .select('id, summary, character_id')
            .eq('id', body.conversationId)
            .eq('user_id', userId)
            .maybeSingle()
        : null,
      // 간식 턴은 검색할 질문이 없으므로 임베딩·기억 검색을 건너뛴다.
      treat
        ? null
        : embedText(userText).then(toPgVector, (err) => {
            console.error('[chat] embedding failed, continuing without RAG', err);
            return null;
          }),
    ]);
    if (characterRes.error) throw characterRes.error;
    const character = characterRes.data;
    if (!character) return jsonError(404, '캐릭터를 찾을 수 없어요.');

    // 기존 대화는 RLS + user_id로 본인 소유만 조회되므로, 남의 conversationId면 404가 된다.
    let conversation: { id: string; summary: string | null };
    if (existingRes) {
      if (existingRes.error) throw existingRes.error;
      if (!existingRes.data || existingRes.data.character_id !== character.id) {
        return jsonError(404, '대화를 찾을 수 없어요.');
      }
      conversation = existingRes.data;
    } else {
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: userId, character_id: character.id, title: userText.slice(0, 40) })
        .select('id, summary')
        .single();
      if (error) throw error;
      conversation = data;
    }

    // 4~6. 유저 메시지 저장 · 최근 대화 · 유저 지식 · 기억 벡터 검색을 동시에.
    // 히스토리는 DB가 원본 (클라이언트가 보낸 히스토리는 신뢰하지 않음). 방금 저장한 메시지는 id로 걸러 내고 직접 붙인다.
    const [insertRes, historyRes, userKnowledge, found] = await Promise.all([
      supabase.from('messages').insert({ conversation_id: conversation.id, role: 'user', content: userText }).select('id').single(),
      supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversation.id)
        .in('role', ['user', 'assistant'])
        .order('created_at', { ascending: false })
        .limit(env.CHAT_HISTORY_LIMIT),
      loadUserKnowledge(supabase, userId, character.id),
      queryEmbedding ? searchMemories({ supabase, characterId: character.id, queryEmbedding }) : [],
    ]);
    if (insertRes.error) throw insertRes.error;
    if (historyRes.error) throw historyRes.error;

    const previous = historyRes.data
      .filter((m) => m.id !== insertRes.data.id)
      .slice(0, env.CHAT_HISTORY_LIMIT - 1)
      .reverse();

    // 히스토리에 이미 들어간 구간의 기억은 중복이므로 제외한다.
    const memories = selectMemories(found, {
      excludeSince: previous[0]?.created_at ?? null,
      topK: env.RAG_MEMORY_TOP_K,
      maxTokens: env.RAG_MAX_CONTEXT_TOKENS,
    });

    const basePrompt = buildSystemPrompt({ character, userKnowledge, memories, summary: conversation.summary });
    const system = treat ? `${basePrompt}\n\n${treatInstruction(treat)}` : basePrompt;
    const lastPrevious = previous.at(-1);
    const previousReply = lastPrevious?.role === 'assistant' ? lastPrevious.content : null;
    // 유저 메시지에만 보낸 시각을 붙인다 (비유의 답에 붙이면 모델이 시각 표기를 따라 한다).
    const history: ModelMessage[] = [
      ...previous.map((m) =>
        m.role === 'user'
          ? { role: 'user' as const, content: withTime(m.content, m.created_at ?? new Date()) }
          : { role: 'assistant' as const, content: m.content },
      ),
      { role: 'user', content: withTime(userText, new Date()) },
    ];

    // 8. 응답 완료 후 처리: assistant 메시지 저장 · updated_at 갱신 · 기억 저장 · 유저 지식 요약.
    // 스트림 종료를 기다리게 하지 않도록 전부 after()에서 처리한다 (응답이 끝난 뒤 실행).
    let resolveTurn!: (turn: Turn) => void;
    const turnDone = new Promise<Turn>((resolve) => (resolveTurn = resolve));
    let streamedText = '';

    after(async () => {
      const turn = await turnDone;
      if (!turn) return;
      const parsed = parseEmotion(turn.text);
      try {
        const [saved, touched] = await Promise.all([
          supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              role: 'assistant',
              content: parsed.content,
              emotion: parsed.emotion,
              token_usage: turn.usage as Json,
            })
            .select('id')
            .single(),
          supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversation.id),
        ]);
        if (saved.error) throw saved.error;
        if (touched.error) console.error('[chat] failed to touch conversation', touched.error);

        // 기억 저장과 유저 지식 요약은 서로 독립이라 한쪽이 실패해도 다른 쪽은 진행한다.
        const [memoryRes, knowledgeRes] = await Promise.allSettled([
          saveTurnMemory({
            supabase,
            userId,
            characterId: character.id,
            characterName: character.name,
            conversationId: conversation.id,
            messageId: saved.data.id,
            userText,
            reply: parsed.content,
          }),
          // 간식 턴에는 유저에 대한 새 정보가 없으므로 요약을 건너뛴다.
          treat
            ? null
            : updateUserKnowledge({
                supabase,
                userId,
                characterId: character.id,
                characterName: character.name,
                previousReply,
                userText,
                reply: parsed.content,
              }),
        ]);
        if (memoryRes.status === 'rejected') console.error('[chat] failed to save memory', memoryRes.reason);
        if (knowledgeRes.status === 'rejected') console.error('[chat] failed to update user knowledge', knowledgeRes.reason);
      } catch (err) {
        console.error('[chat] failed to persist turn', err);
      }
    });

    // 7. 스트리밍
    const stream = createUIMessageStream<ChatUIMessage>({
      execute: ({ writer }) => {
        const result = streamText({
          model: chatModel(),
          system,
          messages: history,
          onChunk: ({ chunk }) => {
            if (chunk.type === 'text-delta') streamedText += chunk.text;
          },
          onEnd: ({ text, totalUsage }) => resolveTurn({ text, usage: totalUsage }),
          onAbort: () => resolveTurn(null),
          onError: ({ error }) => {
            console.error('[chat] stream error', error);
            resolveTurn(null);
          },
        });

        writer.merge(
          result.toUIMessageStream<ChatUIMessage>({
            // 9. 감정은 finish 이벤트의 메시지 메타데이터로 전달
            messageMetadata: ({ part }) => {
              if (part.type === 'start') return { conversationId: conversation.id };
              if (part.type === 'finish') return { conversationId: conversation.id, emotion: parseEmotion(streamedText).emotion };
              return undefined;
            },
          }),
        );
      },
      onError: (err) => {
        console.error('[chat] ui stream error', err);
        resolveTurn(null);
        return '비유가 잠깐 구름 속에서 길을 잃었어요. 잠시 후 다시 말을 걸어 주세요.';
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    console.error('[chat] request failed', err);
    return jsonError(500, '비유가 잠깐 졸고 있어요. 잠시 후 다시 시도해 주세요.');
  }
}
