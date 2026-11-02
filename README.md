# 비유와 대화하기 🦙

화면에 둥둥 떠 있는 픽셀 라마 **비유(Beyou)** 와 대화하는 Next.js 15 앱입니다.
Supabase(Auth · Postgres · RLS · pgvector) + OpenAI + Vercel AI SDK를 사용하고,
캐릭터 설정은 시스템 프롬프트에 통째로 넣고, **유저별** 지식(이름 등)은 대화 중 자동 요약해 저장하며,
과거 대화는 RAG로 검색해 답변에 반영합니다.

## 셋업 순서

> 패키지 매니저는 pnpm 10입니다(`package.json`의 `packageManager`). 전역 pnpm이 다른 버전이어도 자동으로 10으로 전환됩니다. 설치되어 있지 않다면 `npm i -g pnpm` 또는 `npx pnpm@10 <명령>`을 쓰세요.

1. **Supabase 프로젝트 생성** — https://supabase.com/dashboard 에서 새 프로젝트를 만듭니다.
2. **마이그레이션 적용** — 아래 중 하나
   - Supabase CLI: `supabase link --project-ref <ref>` → `supabase db push`
   - 또는 Dashboard → SQL Editor에서 `supabase/migrations/`의 `0001` → `0004`를 순서대로 실행
3. **환경 변수** — `cp .env.example .env.local` 후 값을 채웁니다.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(또는 기존 `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_SERVICE_ROLE_KEY`(secret key): Dashboard → Project Settings → API Keys
   - `OPENAI_API_KEY`, `OPENAI_MODEL`(기본 `gpt-6-luna`)
   - (선택) `OPENAI_UTILITY_MODEL`: 유저 지식 요약·대화 유도 문구용 모델 (비우면 `OPENAI_MODEL`)
4. **유저 생성** — 앱에는 회원가입이 없습니다. **Dashboard → Authentication → Users → Add user** 에서
   이메일/비밀번호로 유저를 직접 만들고 "Auto Confirm User"를 체크하세요.
   Authentication → Sign In / Providers에서 **"Allow new users to sign up"을 꺼도** 앱은 정상 동작합니다.
5. **캐릭터 인제스트** — `pnpm ingest` (아래 "캐릭터 md" 참고)
6. **개발 서버** — `pnpm dev` → http://localhost:3000

(선택) 타입 재생성: `npx supabase login` 후 `pnpm db:types`

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (픽셀 그리드 검증, 감정 파서, 토큰 예산) |
| `pnpm ingest [slug ...]` | 캐릭터(system.md + fewshot.md) upsert |
| `pnpm db:types` | `supabase gen types` → `src/types/database.ts` |

## 캐릭터 md

캐릭터마다 폴더 하나, `system.md`(필수)와 `fewshot.md`(선택)로 관리합니다. 수정한 뒤 `pnpm ingest`(또는 `pnpm ingest beyou`)를 다시 실행하면 반영됩니다.

```
characters/beyou/
├── system.md      # 프런트매터(slug, name, description) + 본문(성격·말투 + [설정]) → characters.system_prompt
└── fewshot.md     # 대화 예시 → characters.few_shot. 시스템 프롬프트의 [대화 예시]로 들어감
```

- `system.md` 본문 전체가 매 요청의 시스템 프롬프트 맨 앞에 들어갑니다 (공통 규칙·감정 태그·유저 지식·과거 기억은 `src/lib/prompts.ts`가 붙임).
- 캐릭터 설정(lore)은 청킹·검색 없이 `# [설정]` 섹션에 통째로 둡니다.

## 시간 개념

LLM에 보내는 히스토리의 유저 메시지 앞에 보낸 시각(`[11월 2일 (월) 오후 3:12]`)을 붙이고, 시스템 프롬프트 맨 끝에
`[현재 시각]`(한국 시간)을 넣습니다(`src/lib/prompts.ts`의 `withTime`). 그래서 비유가 "아까", "며칠 만이네요", 늦은 밤 같은
시간 흐름을 알고 답합니다. 비유의 답에는 시각을 붙이지 않아 모델이 시각 표기를 따라 하지 않습니다.
비유가 먼저 하는 말(인사·말 걸기)의 최근 대화에도 시각이 붙습니다.

## 유저 지식

`user_knowledge` 테이블에 (유저, 캐릭터)마다 요약 한 덩어리를 저장하고, 매 요청 `[유저 지식]`으로 통째로 넣습니다.

- 응답이 끝난 뒤 `after()`에서 비동기로, 기존 유저 지식 + 이번 턴(직전 캐릭터 발화 · 유저 발화 · 응답)을 LLM에 주고
  갱신된 전체 목록을 받습니다(`src/lib/chat/userKnowledge.ts`). 새로 알게 된 게 없으면 `NO_CHANGE`로 저장을 생략합니다.
- `## 프로필`(이름·직업·취향 등 오래가는 사실)과 `## 최근 이야기`(날짜가 붙은 감정·고민·일정·관심 주제, 최대 10개) 두 묶음으로 쌓습니다.
  "ㅎㅇ"처럼 정보가 없는 턴만 건너뛰며, 잊어 달라고 한 내용은 지웁니다. 서버 로그에 `[user-knowledge] updated / no change`가 찍힙니다.
- 턴마다 요약용 LLM 호출이 한 번 추가됩니다. 비용이 걱정되면 `OPENAI_UTILITY_MODEL`에 작은 모델을 지정하세요.

## 비유가 먼저 하는 말

`GET /api/proactive?characterSlug=beyou&kind=greeting|nudge`가 비유가 먼저 하는 말을 스트리밍합니다(`src/lib/chat/proactive.ts`).
채팅과 같은 시스템 프롬프트(캐릭터 정의·대화 예시·유저 지식)에 상황 설명과 최근 대화 6개를 덧붙이고,
완성된 말은 최근 대화에 assistant 메시지로 저장해 유저의 다음 답장이 맥락을 잃지 않게 합니다.
유저가 도중에 먼저 말을 걸거나 간식을 주면 생성을 중단하고 저장하지 않습니다.

- **재방문 인사(greeting)**: 이전 대화나 유저 지식이 있는 유저가 접속하면, 고정 인사 대신 이름을 부르고 지난 이야기 하나를 이어서 묻습니다.
- **말 걸기(nudge)**: 말풍선이 사라지고 조용해진 뒤 20~30초(랜덤)가 지나면 먼저 말을 겁니다. 두 단계로 만듭니다.
  1) 화제 출처(유저 지식 / 무작위 예전 기억 / 몽실계 이야기 / 인간 세계의 신기한 것)를 무작위로 정하고, 보조 모델이
  최근 메시지 20개(이전 말 걸기 포함)와 **겹치지 않는** 새 화제를 한 줄로 고릅니다. 2) 비유가 그 화제로만 말을 겁니다.
  서버 로그에 `[proactive] nudge topic: …`이 찍힙니다. 입력 중이거나 탭이 백그라운드면 미루고, 답이 없으면 연속 3번까지만 겁니다
  (유저가 말을 걸거나 간식을 주면 초기화). 간격·횟수는 `ChatContainer.tsx`의 `NUDGE_*`, `MAX_NUDGES`.

## 간식 주기

오른쪽 위 로그아웃 버튼 아래의 픽셀 간식 버튼(당근, 민들레 잎)을 누르면 `/api/chat`에 `action: 'treat'`, `treat: 'carrot' | 'dandelion'`으로 요청합니다.
서버가 `(간식으로 민들레 잎을 건넸다)` 같은 유저 턴을 저장한 뒤, 간식별 맛 힌트와 함께 기뻐하라는 상황 설명을
시스템 프롬프트에 붙여 답을 스트리밍합니다(`src/lib/chat/treat.ts`). 답을 기다리는 동안은 로딩 대신 그 간식을 먹는
픽셀 모션(`eating_carrot` / `eating_dandelion`)이 나옵니다. 간식 추가는 `TREATS`(이름·맛) + `llama/faces.ts`의 `TREAT_PIECES`(먹는 조각)
+ `llama/treatIcons.ts`(버튼 아이콘)에 같은 id로 넣으면 됩니다.
일반 채팅과 같은 레이트리밋·대화 저장·기억 저장을 거치며, 간식 턴은 기억 검색과 유저 지식 요약을 건너뜁니다.

## 전체화면

왼쪽 위 버튼으로 전체화면을 켜고 끕니다(`FullscreenButton.tsx`). 전체화면 중에는 로그아웃 버튼이 숨고 간식 버튼이 그 자리로 올라갑니다.
전체화면 API가 없는 브라우저(iPhone Safari 등)에서는 버튼이 나오지 않습니다 — iPhone은 홈 화면에 추가하면 주소창 없이 열 수 있습니다.

## 대화 유도 문구

입력창 placeholder는 `GET /api/hint?characterSlug=beyou`가 text 스트림으로 보내는 문구입니다(`src/lib/chat/hint.ts`). 생성되는 대로 채워집니다.
캐릭터 설정 + 유저 지식에, 절반 확률로 이 유저의 과거 대화(`memories`) 중 하나를 무작위로 골라 함께 LLM에 주고
유저가 비유에게 건넬 법한 한 문장(유저 1인칭 반말, 관심 있으면서 아닌 척하는 츤데레 말투)을 받습니다. 비유의 마지막 말이 있으면 거기에 답하는 말을 우선합니다.
비유 쪽 말투(뿌우, 행동 묘사 괄호, 해요체, "저는" 등)로 나오면 버리고 한 번 다시 받습니다(`looksLikeCharacterLine`). 입력창이 비어 있을 때 보내기(Enter)를 누르면 이 문구가 그대로 전송됩니다(다 만들어진 뒤에만). 접속할 때와 답변이 끝날 때마다 갱신되며, 실패하면 기본 문구를 씁니다.

## ⚠️ 임베딩 차원

벡터 차원은 env `EMBEDDING_DIMENSIONS` **하나로** 통제하며, 마이그레이션의 `vector(1536)`과 반드시 같아야 합니다.
차원(또는 임베딩 모델)을 바꾸려면:

1. `EMBEDDING_DIMENSIONS`와 `OPENAI_EMBEDDING_MODEL` 수정
2. 새 마이그레이션에서 `memories.embedding` 컬럼과 `match_memories`의 `query_embedding` 인자를 `vector(N)`으로 변경 (HNSW 인덱스 재생성 포함)
3. 기존 임베딩은 호환되지 않으므로 `memories`는 비우거나 재임베딩

차원이 어긋나면 `embedBatch()`가 에러를 던집니다.

## 사용자별 데이터 격리

- `conversations.user_id = auth.users.id`, RLS `auth.uid() = user_id` — 대화 이력은 본인 것만 읽고 쓸 수 있습니다.
- `messages`는 소유한 대화를 통해서만 접근됩니다(RLS).
- `user_knowledge`(유저 지식)도 `user_id` + RLS로 격리되며, 유저 세션 클라이언트로만 읽고 씁니다.
- `memories`(장기 기억)도 `user_id` + RLS로 격리되며, `match_memories`는 `security invoker` + `m.user_id = auth.uid()`로
  **로그인한 유저의 기억만** 검색합니다. `/api/chat`은 이 함수를 유저 세션 클라이언트로 호출합니다.
- 클라이언트가 보낸 `conversationId`는 서버에서 본인 소유인지 확인하고, 대화 히스토리는 클라이언트가 아닌 DB에서 읽습니다.
- service role 키는 캐릭터 인제스트(`lib/characters.ts`)에서만 사용합니다.

## API

### `POST /api/chat`
`useChat` 규격 `{ conversationId?, characterSlug, messages }`. 세션 필수(401), 분당 `CHAT_RATE_LIMIT_PER_MIN`회(429),
`CHAT_MAX_INPUT_CHARS`자 제한(413). 새 대화면 메시지 메타데이터(`conversationId`)로 id를 돌려줍니다.
감정(`happy|sad|surprised|neutral|tsundere`)은 finish 메타데이터로 전달되고, `[emotion:*]` 태그는 화면과 DB에서 제거됩니다.

레이트리밋은 기본적으로 프로세스 메모리(Map)를 쓰며, `UPSTASH_REDIS_REST_URL`/`TOKEN`이 있으면 Upstash를 사용합니다.

## 낮과 밤

기기의 현재 시각에 따라 하늘이 바뀝니다(`src/components/character/daylight.ts`, 1분마다 갱신).
17:30~19:30에 노을빛을 지나 점점 어두워지고, 4:30~6:30에 여명과 함께 밝아집니다.
밤에는 해가 지평선 뒤로 내려가고 픽셀 초승달과 반짝이는 별이 뜨며, 구름과 풀밭도 어두워집니다(비유와 말풍선은 그대로 밝게).
미리보기: 주소에 `?hour=18.5`, `?hour=22`처럼 시각을 붙이면 그 시각의 하늘을 볼 수 있습니다.

## 픽셀 라마

`src/components/character/llama/` — 외부 에셋 없이 24×24 문자 그리드(`base.ts`)에 표정 패치(`faces.ts`)를 합성(`compose.ts`)해
SVG `<rect>`로 그립니다. 색은 `palette.ts`에만 있습니다. 상태별 프레임은 `frames.ts`(120ms 틱)에 정의되어 있습니다.
