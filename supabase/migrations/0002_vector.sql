-- 0002_vector: pgvector, 지식/기억 임베딩 테이블, 검색 함수
-- ⚠️ vector(1536)은 env의 EMBEDDING_DIMENSIONS와 반드시 일치해야 한다.
--    차원을 바꾸면 이 파일의 vector(N) 4곳을 모두 바꾸고 새 마이그레이션으로 재생성할 것.

create extension if not exists vector with schema extensions;

-- (1) 캐릭터 지식 문서 (lore / FAQ / 설정)
create table knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  character_id uuid references characters(id) on delete cascade,  -- null이면 공용
  title text not null,
  source text,
  created_at timestamptz default now()
);

create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references knowledge_documents(id) on delete cascade,
  character_id uuid references characters(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding extensions.vector(1536) not null,     -- EMBEDDING_DIMENSIONS와 일치시킬 것
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index on knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index on knowledge_chunks (character_id);

-- (2) 장기 기억: 유저별 과거 대화 임베딩
create table memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  message_id uuid references messages(id) on delete set null,
  content text not null,               -- "유저: ... / 캐릭터: ..." 한 턴 단위
  embedding extensions.vector(1536) not null,
  created_at timestamptz default now()
);

create index on memories using hnsw (embedding extensions.vector_cosine_ops);
create index on memories (user_id, character_id);

-- RLS
alter table knowledge_documents enable row level security;
alter table knowledge_chunks enable row level security;
alter table memories enable row level security;

create policy "knowledge readable" on knowledge_documents for select using (true);
create policy "chunks readable" on knowledge_chunks for select using (true);
-- 쓰기는 service role만 (정책 없음 = anon/authenticated 불가)

create policy "own memories" on memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 검색 함수: 지식
create or replace function match_knowledge(
  query_embedding extensions.vector(1536),
  p_character_id uuid,
  match_count int default 5,
  match_threshold float default 0.3
)
returns table (id uuid, content text, metadata jsonb, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select kc.id, kc.content, kc.metadata,
         1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where (kc.character_id = p_character_id or kc.character_id is null)
    and 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

-- 검색 함수: 기억 (현재 대화 제외, RLS 적용되도록 security invoker)
create or replace function match_memories(
  query_embedding extensions.vector(1536),
  p_character_id uuid,
  p_exclude_conversation_id uuid default null,
  match_count int default 5,
  match_threshold float default 0.35
)
returns table (id uuid, content text, created_at timestamptz, similarity float)
language sql stable security invoker
set search_path = public, extensions
as $$
  select m.id, m.content, m.created_at,
         1 - (m.embedding <=> query_embedding) as similarity
  from memories m
  where m.user_id = auth.uid()
    and m.character_id = p_character_id
    and (p_exclude_conversation_id is null
         or m.conversation_id is distinct from p_exclude_conversation_id)
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
