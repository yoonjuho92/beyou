/**
 * 픽셀 문자 → 색상. 라마의 모든 색은 여기서만 정의한다.
 * null = 투명 (rect를 그리지 않음)
 */
export const PALETTE = {
  '.': null, // 투명
  B: '#5b3a29', // 짙은 갈색 외곽선 / 발굽 / 입
  W: '#fff8ec', // 크림색 털 (밝은 톤)
  w: '#ead8bd', // 털 그림자
  P: '#f6a6b2', // 분홍 코 / 볼 / 귀 안쪽
  K: '#3b2418', // 눈동자 (검정 대신 아주 짙은 갈색)
  H: '#ffffff', // 눈 하이라이트
  M: '#c8575f', // 벌린 입 안쪽
  T: '#3fa69c', // 안장 담요 (포인트 컬러)
  Y: '#f4c95d', // 담요 무늬
  D: '#7cc4f5', // 눈물
  G: '#9aa5b1', // 생각 중 점
  O: '#f28c28', // 간식 당근
  R: '#d0681a', // 당근 줄무늬 (진한 주황)
  L: '#6cbf4a', // 당근 잎 / 민들레 잎
  V: '#3f8a2e', // 민들레 잎맥 (진한 초록)
} as const satisfies Record<string, string | null>;

export type PixelChar = keyof typeof PALETTE;

/** 패치에서 "베이스를 그대로 둔다"는 뜻의 문자. 팔레트 문자가 아님. */
export const KEEP = '_';

export const GRID_SIZE = 24;

export function isPixelChar(c: string): c is PixelChar {
  return Object.prototype.hasOwnProperty.call(PALETTE, c);
}
