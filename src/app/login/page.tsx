import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: '로그인 · 비유' };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border-2 border-bark/20 bg-cream/90 p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold">비유와 대화하기</h1>
        <p className="mb-6 text-sm text-bark/70">발급받은 계정으로 로그인하세요.</p>
        <LoginForm />
      </div>
    </main>
  );
}
