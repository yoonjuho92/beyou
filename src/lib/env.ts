import { z } from 'zod';

/**
 * 환경 변수 진입점 (process.env는 여기와 env.server.ts에서만 읽는다).
 * - publicEnv(): 클라이언트/서버 공용 (NEXT_PUBLIC_*). Next가 빌드 시 인라인하도록 리터럴로 참조한다.
 * - serverEnv(): 비밀 값. `@/lib/env.server`에서 가져오며 'server-only'로 클라이언트 번들 유입을 막는다.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  /** 새 키 체계의 publishable key(sb_publishable_...) 또는 기존 anon key */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다'),
  NEXT_PUBLIC_DEFAULT_CHARACTER: z.string().min(1).default('beyou'),
});

export type PublicEnv = z.infer<typeof publicSchema>;

export function formatIssues(error: z.ZodError) {
  return error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
}

let cachedPublic: PublicEnv | undefined;
export function publicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    NEXT_PUBLIC_DEFAULT_CHARACTER: process.env.NEXT_PUBLIC_DEFAULT_CHARACTER,
  });
  if (!parsed.success) {
    throw new Error(`공개 환경 변수가 올바르지 않습니다:\n${formatIssues(parsed.error)}`);
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}
