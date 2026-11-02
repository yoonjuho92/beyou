import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { serverEnv } from '@/lib/env.server';
import { chatModel } from '@/lib/openai';
import type { Database } from '@/types/database';

const NO_CHANGE = 'NO_CHANGE';
/** 유저 지식 전체 길이 상한. 매 요청 시스템 프롬프트에 통째로 들어가므로 이 안으로 요약해 둔다. */
export const USER_KNOWLEDGE_MAX_CHARS = 2000;

/** 상한을 넘으면 줄 단위로 자른다 (마지막 안전장치. 평소에는 요약으로 상한 안에 들어온다). */
export function clampUserKnowledge(text: string): string {
  if (text.length <= USER_KNOWLEDGE_MAX_CHARS) return text;
  const cut = text.slice(0, USER_KNOWLEDGE_MAX_CHARS);
  const lastBreak = cut.lastIndexOf('\n');
  return (lastBreak > 0 ? cut.slice(0, lastBreak) : cut).trimEnd();
}

/** "11/2" 형식 */
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' });

type Client = SupabaseClient<Database>;

/** (유저, 캐릭터)의 유저 지식. 아직 없으면 null. */
export async function loadUserKnowledge(supabase: Client, userId: string, characterId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_knowledge')
    .select('content')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .maybeSingle();
  if (error) {
    // 조회 실패는 대화를 막지 않는다.
    console.error('[user-knowledge] load failed', error);
    return null;
  }
  return data?.content ?? null;
}

function extractionPrompt(characterName: string) {
  return [
    `너는 캐릭터 '${characterName}'가 대화 상대(유저)에 대해 알게 된 것을 정리하는 기록 담당이다.`,
    '[기존 유저 지식]과 [이번 대화]를 보고, 유저 지식을 갱신한 전체 목록을 출력한다.',
    '대화할 때마다 유저에 대해 조금이라도 새로 알게 된 것이 있으면 적극적으로 반영한다.',
    '',
    '아래 두 묶음으로 나누어 적는다:',
    '## 프로필',
    '- 이름·호칭, 나이·직업·학교·사는 곳, 가족·친구·반려동물, 좋아하는 것·싫어하는 것, 취미, 성격·말투 같은 오래가는 사실',
    '## 최근 이야기',
    '- 유저가 털어놓은 감정·고민(예: "무섭다", "우울하다"), 진행 중인 일·일정, 비유에게 궁금해한 것·관심을 보인 주제',
    '- 각 항목 앞에 [이번 대화]의 날짜를 (M/D) 형식으로 붙인다. 같은 주제가 이어지면 기존 항목을 고쳐 최신 상태로 둔다.',
    '- 오래된 항목부터 지워 최근 이야기는 최대 10개로 유지한다.',
    '',
    '규칙:',
    '- 각 항목은 "- "로 시작하는 짧은 한 줄. 프로필은 최대 15줄.',
    '- 유저가 직접 말했거나 대화에서 분명히 드러난 것만 적는다. 추측하지 않는다. 캐릭터 자신의 정보는 적지 않는다.',
    '- 기존 항목과 충돌하는 새 정보가 있으면 새 정보로 고친다. 유저가 잊어 달라고 한 내용은 지운다.',
    '- 비어 있는 묶음은 제목째 생략한다.',
    `- 전체 길이는 ${USER_KNOWLEDGE_MAX_CHARS}자 이내. 넘을 것 같으면 비슷한 항목을 합치고 덜 중요하거나 오래된 항목부터 지운다.`,
    `- "ㅎㅇ", "응"처럼 정말 아무 정보가 없는 대화일 때만 다른 말 없이 ${NO_CHANGE}만 출력한다.`,
  ].join('\n');
}

/** 상한을 넘은 유저 지식을 형식을 유지한 채 다시 요약한다. */
async function compress(text: string, characterName: string): Promise<string> {
  const target = Math.floor(USER_KNOWLEDGE_MAX_CHARS * 0.8);
  const { text: compressed } = await generateText({
    model: chatModel(serverEnv().OPENAI_UTILITY_MODEL),
    system: [
      `아래는 캐릭터 '${characterName}'가 유저에 대해 기록해 둔 지식이다. ${target}자 이내로 요약해 다시 출력한다.`,
      '- "## 프로필", "## 최근 이야기" 묶음과 "- " 항목 형식, 날짜 표기는 그대로 유지한다.',
      '- 이름·호칭과 오래가는 프로필 사실은 남기고, 비슷한 항목은 합치며, 오래되거나 덜 중요한 최근 이야기부터 지운다.',
      '- 요약한 목록만 출력한다.',
    ].join('\n'),
    prompt: text,
  });
  return compressed.trim();
}

type UpdateInput = {
  /** 유저 세션 클라이언트. RLS(own user knowledge)가 user_id = auth.uid()를 강제한다. */
  supabase: Client;
  userId: string;
  characterId: string;
  characterName: string;
  /** 유저 발화 직전의 캐릭터 발화 ("이름이 뭐예요?" → "주호" 같은 짧은 답의 맥락) */
  previousReply: string | null;
  userText: string;
  reply: string;
};

/**
 * 이번 턴에서 유저에 대해 새로 알게 된 사실이 있으면 유저 지식을 요약·갱신한다.
 * 응답이 끝난 뒤 after()에서 비동기로 호출된다.
 */
export async function updateUserKnowledge(input: UpdateInput): Promise<void> {
  const env = serverEnv();
  // 연속 턴의 갱신이 서로 덮어쓰지 않도록 저장 직전의 최신본을 다시 읽는다.
  const current = await loadUserKnowledge(input.supabase, input.userId, input.characterId);

  const turn = [
    input.previousReply ? `${input.characterName}: ${input.previousReply.trim()}` : null,
    `유저: ${input.userText.trim()}`,
    `${input.characterName}: ${input.reply.trim()}`,
  ]
    .filter(Boolean)
    .join('\n');

  const { text } = await generateText({
    model: chatModel(env.OPENAI_UTILITY_MODEL),
    system: extractionPrompt(input.characterName),
    prompt: `[기존 유저 지식]\n${current?.trim() || '없음'}\n\n[이번 대화] (${dateFormat.format(new Date())})\n${turn}`,
  });

  let next = text.trim();
  if (!next || next.includes(NO_CHANGE) || next === current?.trim()) {
    console.info('[user-knowledge] no change');
    return;
  }
  if (next.length > USER_KNOWLEDGE_MAX_CHARS) {
    console.info(`[user-knowledge] ${next.length}자 → 요약`);
    next = await compress(next, input.characterName);
  }

  const { error } = await input.supabase.from('user_knowledge').upsert(
    {
      user_id: input.userId,
      character_id: input.characterId,
      content: clampUserKnowledge(next),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,character_id' },
  );
  if (error) throw error;
  console.info('[user-knowledge] updated');
}
