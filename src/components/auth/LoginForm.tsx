'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

const GENERIC_ERROR = '이메일 또는 비밀번호가 올바르지 않습니다';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    setPending(true);
    setError(null);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    setPending(false);

    if (signInError) {
      // 계정 존재 여부를 유추할 수 없도록 항상 같은 메시지를 보여준다.
      console.error('[login]', signInError.status, signInError.code);
      setError(GENERIC_ERROR);
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        이메일
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border-2 border-bark/30 bg-white px-3 py-2 text-base outline-none focus:border-bark"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        비밀번호
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border-2 border-bark/30 bg-white px-3 py-2 text-base outline-none focus:border-bark"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-bark px-4 py-2 font-semibold text-cream transition hover:bg-bark/90 disabled:opacity-60"
      >
        {pending ? '로그인 중…' : '로그인'}
      </button>
    </form>
  );
}
