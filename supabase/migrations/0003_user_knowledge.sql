-- 0003_user_knowledge: 캐릭터 지식 RAG 제거 + 유저별 지식 추가
-- - 캐릭터 설정(lore)은 characters.system_prompt에 통째로 들어간다 (characters/<slug>/system.md).
--   → knowledge_documents / knowledge_chunks / match_knowledge 삭제
-- - user_knowledge: 대화에서 알게 된 유저 이름·중요 정보를 비동기로 요약해 (유저, 캐릭터)마다 한 덩어리로 저장.
--   청킹·임베딩 없이 매 요청 시스템 프롬프트에 통째로 들어가고, 재방문 인사에도 쓰인다.

drop function if exists match_knowledge(extensions.vector, uuid, int, float);
drop table if exists knowledge_chunks;
drop table if exists knowledge_documents;

create table user_knowledge (
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  content text not null,
  updated_at timestamptz default now(),
  primary key (user_id, character_id)
);

alter table user_knowledge enable row level security;

create policy "own user knowledge" on user_knowledge
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
