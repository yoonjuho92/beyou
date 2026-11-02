-- 0001_init: 캐릭터 / 대화 / 메시지 + RLS
-- 유저 계정은 Supabase Auth(auth.users)를 그대로 사용한다. profiles 테이블 없음.

create table characters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  system_prompt text not null,
  avatar_config jsonb default '{}',
  created_at timestamptz default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references characters(id),
  title text,
  summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  emotion text,
  token_usage jsonb,
  created_at timestamptz default now()
);

create index on messages (conversation_id, created_at);
create index on conversations (user_id, updated_at desc);

alter table characters enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "characters readable" on characters for select using (true);
create policy "own conversations" on conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own messages" on messages
  for all using (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id and c.user_id = auth.uid()
  ));
