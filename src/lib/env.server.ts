import 'server-only';
import { z } from 'zod';
import { formatIssues } from '@/lib/env';

/** 서버 전용 환경 변수. 클라이언트 컴포넌트에서 import하면 빌드가 실패한다. */

const int = (def: number) => z.coerce.number().int().positive().default(def);
const ratio = (def: number) => z.coerce.number().min(0).max(1).default(def);
const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default('gpt-6-luna'),
  /** 보조 작업(유저 지식 요약, 대화 유도 문구)용 모델. 비우면 OPENAI_MODEL */
  OPENAI_UTILITY_MODEL: optional,
  OPENAI_EMBEDDING_MODEL: z.string().min(1).default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: int(1536),
  OPENAI_ORG_ID: optional,
  OPENAI_PROJECT_ID: optional,

  CHAT_HISTORY_LIMIT: int(20),
  CHAT_MAX_INPUT_CHARS: int(2000),
  CHAT_RATE_LIMIT_PER_MIN: int(20),

  RAG_MEMORY_TOP_K: int(5),
  RAG_MEMORY_THRESHOLD: ratio(0.35),
  /** 과거 기억 섹션의 토큰 상한 (지식은 전문이 들어가므로 해당 없음) */
  RAG_MAX_CONTEXT_TOKENS: int(1500),

  UPSTASH_REDIS_REST_URL: optional,
  UPSTASH_REDIS_REST_TOKEN: optional,
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cachedServer: ServerEnv | undefined;
export function serverEnv(): ServerEnv {
  if (cachedServer) return cachedServer;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`서버 환경 변수가 올바르지 않습니다:\n${formatIssues(parsed.error)}`);
  }
  cachedServer = parsed.data;
  return cachedServer;
}
