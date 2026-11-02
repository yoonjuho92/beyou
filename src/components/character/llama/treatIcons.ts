import type { TreatId } from '@/lib/chat/treat';

/**
 * 간식 버튼 아이콘 (12×12). 비유와 같은 팔레트를 쓴다.
 * 범례: . 투명  B 외곽선  O 당근  R 당근 줄무늬  L 잎  V 잎맥
 */
export const TREAT_ICONS: Record<TreatId, readonly string[]> = {
  // prettier-ignore
  carrot: [
    '.........L.L',
    '........LLL.',
    '......BBBLLL',
    '.....BOOOB..',
    '....BOOROB..',
    '...BOOOOB...',
    '...BOROB....',
    '..BOOOB.....',
    '..BROB......',
    '.BOB........',
    '.BB.........',
    '............',
  ],
  // 가장자리가 톱니처럼 들쭉날쭉한 민들레 잎 + 가운데 잎맥과 줄기
  // prettier-ignore
  dandelion: [
    '......B.....',
    '.....BLB....',
    '....BLVLB...',
    '...BLLVLLB..',
    '..BLLLVLLLB.',
    '.BLLLLVLLLLB',
    '...BLLVLLB..',
    '..BLLLVLLLB.',
    '.BLLLLVLLLLB',
    '...BLLVLLB..',
    '....BBVBB...',
    '......V.....',
  ],
};
