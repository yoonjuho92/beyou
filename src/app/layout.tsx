import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '비유와 대화하기',
  description: '둥둥 떠다니는 픽셀 라마 비유와 대화하는 채팅 앱',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 노치·홈 인디케이터 영역까지 그리고, 안쪽 여백은 env(safe-area-inset-*)로 맞춘다.
  viewportFit: 'cover',
  // Android Chrome: 키보드가 올라오면 레이아웃 높이 자체를 줄인다 (iOS는 useVisualViewport가 처리).
  interactiveWidget: 'resizes-content',
  themeColor: '#e8f4ff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
