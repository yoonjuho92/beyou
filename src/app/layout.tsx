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
  // 키보드가 올라와도 레이아웃 높이는 그대로 둔다. 입력창만 useVisualViewport의 --kb만큼 올린다 (iOS와 동작 통일).
  interactiveWidget: 'resizes-visual',
  themeColor: '#e8f4ff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
