import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import { createClient } from '@/lib/supabase/server';
import type { ChatUIMessage, Emotion } from '@/types';

const RESTORE_LIMIT = 100;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const slug = publicEnv().NEXT_PUBLIC_DEFAULT_CHARACTER;
  const { data: character, error: characterError } = await supabase
    .from('characters')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle();
  if (characterError) console.error('[home] failed to load character', characterError);

  if (!character) {
    return (
      <Shell>
        <p className="px-4 py-20 text-center text-bark/70">
          캐릭터 <code>{slug}</code>를 찾을 수 없어요. <code>pnpm ingest</code>를 실행했는지 확인해 주세요.
        </p>
      </Shell>
    );
  }

  // 이 유저의 가장 최근 대화 1개 + 메시지 복원 (RLS + user_id 필터로 본인 것만)
  // 대화나 유저 지식이 있으면 재방문으로 보고 맞춤 인사를 띄운다.
  const [{ data: conversation }, { data: knowledge }] = await Promise.all([
    supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('character_id', character.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('user_knowledge').select('user_id').eq('user_id', user.id).eq('character_id', character.id).maybeSingle(),
  ]);

  let initialMessages: ChatUIMessage[] = [];
  if (conversation) {
    const { data: rows, error } = await supabase
      .from('messages')
      .select('id, role, content, emotion')
      .eq('conversation_id', conversation.id)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .limit(RESTORE_LIMIT);
    if (error) console.error('[home] failed to restore messages', error);
    initialMessages = (rows ?? []).reverse().map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      parts: [{ type: 'text', text: m.content }],
      metadata: { conversationId: conversation.id, emotion: (m.emotion ?? undefined) as Emotion | undefined },
    }));
  }

  return (
    <Shell>
      <ChatContainer
        characterSlug={slug}
        characterName={character.name}
        initialConversationId={conversation?.id ?? null}
        initialMessages={initialMessages}
        returning={Boolean(conversation || knowledge)}
        maxInputChars={serverEnv().CHAT_MAX_INPUT_CHARS}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    // 키보드가 올라와도 크기는 그대로. iOS가 화면을 민 만큼(--vvtop)만 따라 내려가 장면이 제자리에 보인다 (useVisualViewport).
    <main className="fixed inset-x-0 top-[var(--vvtop,0px)] h-[var(--app-h,100dvh)] w-full overflow-hidden">
      <div className="hide-in-fullscreen absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-[calc(env(safe-area-inset-right)+0.75rem)] z-30">
        <LogoutButton />
      </div>
      {children}
    </main>
  );
}
