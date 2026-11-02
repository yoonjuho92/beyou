/**
 * 픽셀 아트 모양을 CSS clip-path로 만든다. 모서리를 px 단위 계단으로 깎아 둥근 픽셀 도형을 그린다.
 * 외곽선은 clip-path를 쓴 요소의 부모에 PIXEL_OUTLINE 필터를 걸어 그린다 (자식 도형들의 합집합을 따라간다).
 */

/** 반지름 r칸짜리 픽셀 원의 한 귀퉁이: 위에서부터 각 줄이 안쪽으로 들어가는 칸 수 */
export function pixelCornerProfile(r: number): number[] {
  const rows: number[] = [];
  for (let i = 0; i < r; i++) {
    const dy = r - i - 0.5;
    const inset = Math.round(r - Math.sqrt(r * r - dy * dy));
    if (inset === 0) break;
    rows.push(inset);
  }
  return rows;
}

/**
 * 네 모서리를 반지름 r칸(한 칸 = px)의 계단으로 깎은 clip-path.
 * 요소 크기가 2r칸이면 픽셀 원, 더 크면 모서리만 둥근 픽셀 상자가 된다.
 */
export function pixelRoundClip(r: number, px: number): string {
  const p = pixelCornerProfile(r).map((n) => n * px);
  const n = p.length;
  const pts: string[] = [];
  // 왼쪽 위: 아래 줄에서 위로
  for (let i = n - 1; i >= 0; i--) pts.push(`${p[i]}px ${(i + 1) * px}px`, `${p[i]}px ${i * px}px`);
  // 오른쪽 위: 위에서 아래로
  for (let i = 0; i < n; i++) pts.push(`calc(100% - ${p[i]}px) ${i * px}px`, `calc(100% - ${p[i]}px) ${(i + 1) * px}px`);
  // 오른쪽 아래: 위에서 아래로
  for (let i = n - 1; i >= 0; i--) {
    pts.push(`calc(100% - ${p[i]}px) calc(100% - ${(i + 1) * px}px)`, `calc(100% - ${p[i]}px) calc(100% - ${i * px}px)`);
  }
  // 왼쪽 아래: 아래에서 위로
  for (let i = 0; i < n; i++) pts.push(`${p[i]}px calc(100% - ${i * px}px)`, `${p[i]}px calc(100% - ${(i + 1) * px}px)`);
  return `polygon(${pts.join(', ')})`;
}

/** 상하좌우로만 그림자를 겹쳐 대각선 없는 픽셀 외곽선 + 아래쪽 픽셀 그림자를 만든다. */
export function pixelOutline(color: string, width: number, shadow?: string): string {
  const outline = [
    `drop-shadow(${width}px 0 0 ${color})`,
    `drop-shadow(-${width}px 0 0 ${color})`,
    `drop-shadow(0 ${width}px 0 ${color})`,
    `drop-shadow(0 -${width}px 0 ${color})`,
  ];
  return shadow ? [...outline, `drop-shadow(${shadow})`].join(' ') : outline.join(' ');
}
