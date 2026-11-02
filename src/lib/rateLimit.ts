import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { serverEnv } from '@/lib/env.server';

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

/** MVP용 프로세스 메모리 슬라이딩 윈도우. 서버 인스턴스가 여러 개면 인스턴스별로 따로 센다. */
function memoryLimit(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfterSec: 0 };
}

let upstash: Ratelimit | null | undefined;
function getUpstash(): Ratelimit | null {
  if (upstash !== undefined) return upstash;
  const env = serverEnv();
  upstash =
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new Ratelimit({
          redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }),
          limiter: Ratelimit.slidingWindow(env.CHAT_RATE_LIMIT_PER_MIN, '1 m'),
          prefix: 'chat-rl',
        })
      : null;
  return upstash;
}

/** 유저당 분당 CHAT_RATE_LIMIT_PER_MIN회. Upstash env가 있으면 Upstash, 없으면 메모리 Map. */
export async function checkChatRateLimit(userId: string): Promise<RateLimitResult> {
  const limiter = getUpstash();
  if (!limiter) return memoryLimit(userId, serverEnv().CHAT_RATE_LIMIT_PER_MIN);
  try {
    const res = await limiter.limit(userId);
    return { ok: res.success, retryAfterSec: Math.max(0, Math.ceil((res.reset - Date.now()) / 1000)) };
  } catch (err) {
    console.error('[rate-limit] upstash failed, falling back to memory', err);
    return memoryLimit(userId, serverEnv().CHAT_RATE_LIMIT_PER_MIN);
  }
}
