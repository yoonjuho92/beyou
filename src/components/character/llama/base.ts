/**
 * 24×24 라마 몸통 (정면 뷰). 얼굴(눈·코·입·볼)은 faces.ts의 패치로 덧그린다.
 *
 * 범례: . 투명  B 외곽선(짙은 갈색)  W 털  w 털 그림자  P 분홍(귀 안쪽)
 *       T 안장 담요  Y 담요 무늬
 *
 * 세로 중심선은 8열. 0~10행 머리(쫑긋한 귀 2개 + 정수리 털), 11~14행 긴 목,
 * 15~20행 몸통 + 담요 + 오른쪽 짧은 꼬리, 21~23행 다리 2개와 발굽.
 * 오른쪽 위(17~23열, 0~7행)는 thinking 점 자리로 비워 둔다.
 */
// prettier-ignore
export const BASE: readonly string[] = [
//          1111111111222
//012345678901234567890123
  '.BB...........BB........', //  0  귀 끝
  'BWPB...BBB...BPWB.......', //  1
  'BWPB..BWWWB..BPWB.......', //  2  정수리 털
  'BWPBBBWWWWWBBBPWB.......', //  3
  '.BWWWWWWWWWWWWWB........', //  4  머리
  '.BWWWWWWWWWWWWWB........', //  5
  '.BWWWWWWWWWWWWWB........', //  6  눈 (4~5열, 11~12열)
  '.BWWWWWWWWWWWWWB........', //  7
  '.BwWWWWWWWWWWWwB........', //  8  코 · 볼
  '..BwWWWWWWWWWwB.........', //  9  입
  '...BwwWWWWWwwB..........', // 10
  '....BBWWWWWBB...........', // 11  목
  '.....BwWWWwB............', // 12
  '.....BwWWWwB............', // 13
  '.....BwWWWwB............', // 14
  '..BBBBwWWWwBBBBBB.......', // 15  어깨
  '.BWWWWWWWWWWWWWWWB.BB...', // 16  몸통 + 꼬리
  '.BTTTTTTTTTTTTTTTBBWWB..', // 17  안장 담요
  '.BYTYTYTYTYTYTYTYB.BB...', // 18  담요 무늬
  '.BwWWWWWWWWWWWWWwB......', // 19
  '..BwwwwwwwwwwwwwB.......', // 20  배
  '..BWWB.......BWWB.......', // 21  다리
  '..BWWB.......BWWB.......', // 22
  '..BBBB.......BBBB.......', // 23  발굽
];
