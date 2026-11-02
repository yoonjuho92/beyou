import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '@/lib/env';
import type { Database } from '@/types/database';

export async function middleware(request: NextRequest) {
  const env = publicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims()가 세션을 확인(필요하면 토큰 갱신)하고 JWT를 검증한다. 이 호출 사이에 다른 로직을 넣지 말 것.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims.sub;

  const { pathname } = request.nextUrl;
  const isLogin = pathname === '/login';

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!user && !isLogin) return redirectTo('/login');
  if (user && isLogin) return redirectTo('/');

  return response;
}

export const config = {
  // /api는 제외: 각 Route Handler가 세션을 직접 확인하고 401을 응답한다 (요청마다 인증 왕복 1회 절약).
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
