import type { Patch } from './compose';

/**
 * 표정 오버레이. 좌표는 base.ts 기준 (x=열, y=행), '_'은 베이스 유지.
 * 범례: K 눈동자  H 하이라이트  B 입/눈썹  M 입 안쪽  P 볼/코  D 눈물  G 생각 점  O 당근  L 당근 잎  W 털(지우개)
 */

const eyes = (rows: readonly string[], lx = 4, rx = 11, y = 6): Patch[] => [
  { x: lx, y, rows },
  { x: rx, y, rows },
];

const nose: Patch = { x: 8, y: 8, rows: ['P'] };
const cheeks: Patch[] = [
  { x: 2, y: 8, rows: ['PP'] },
  { x: 13, y: 8, rows: ['PP'] },
];
const smile: Patch = { x: 6, y: 9, rows: ['B___B', '_BBB_'] };

export const FACES = {
  idle: [...eyes(['HK', 'KK']), nose, ...cheeks, smile],

  blink: [...eyes(['WW', 'KK']), nose, ...cheeks, smile],

  // 눈동자가 위를 보고, 입은 일자
  thinking: [...eyes(['KK', 'WW']), nose, ...cheeks, { x: 7, y: 9, rows: ['BBB'] }],

  talking_open: [...eyes(['HK', 'KK']), nose, ...cheeks, { x: 7, y: 9, rows: ['BBB', 'BMB', '_B_'] }],

  talking_closed: [...eyes(['HK', 'KK']), nose, ...cheeks, { x: 7, y: 9, rows: ['B_B', '_B_'] }],

  // ^ ^ 눈 + 넓어진 볼 + 활짝 웃는 입
  happy: [
    ...eyes(['_K_', 'K_K'], 3, 11),
    nose,
    { x: 2, y: 8, rows: ['PPP', '_PP'] },
    { x: 12, y: 8, rows: ['PPP', 'PP_'] },
    { x: 6, y: 9, rows: ['BBBBB', '_BMB_'] },
  ],

  // 안쪽이 올라간 눈썹 + 눈물 + 뒤집힌 입
  sad: [
    { x: 4, y: 4, rows: ['__B', 'BB_'] },
    { x: 10, y: 4, rows: ['B__', '_BB'] },
    ...eyes(['HK', 'KK']),
    { x: 4, y: 8, rows: ['D'] },
    { x: 12, y: 8, rows: ['D'] },
    nose,
    { x: 6, y: 9, rows: ['_BBB_', 'B___B'] },
  ],

  // 3×3 동그란 눈 + O 입
  surprised: [
    ...eyes(['KKK', 'KHK', 'KKK'], 3, 11, 5),
    nose,
    ...cheeks,
    { x: 7, y: 9, rows: ['_B_', 'BMB', '_B_'] },
  ],
} as const satisfies Record<string, readonly Patch[]>;

/** 머리 오른쪽 위로 비스듬히 올라가며 순서대로 켜지는 생각 점 3개 (2×2) */
export const THINKING_DOTS: readonly Patch[] = [
  { x: 17, y: 6, rows: ['GG', 'GG'] },
  { x: 19, y: 3, rows: ['GG', 'GG'] },
  { x: 22, y: 0, rows: ['GG', 'GG'] },
];

/** 먹기(eating)용 얼굴 조각. 당근은 입(7~9열) 오른쪽에 물려 있다. */
const happyEyes = eyes(['_K_', 'K_K'], 3, 11);
const openEyes = eyes(['HK', 'KK']);
const mouthOpen: Patch = { x: 7, y: 9, rows: ['BBB', 'BMB', '_B_'] };
const chewFlat: Patch = { x: 7, y: 9, rows: ['BBB'] };
const chewRound: Patch = { x: 7, y: 9, rows: ['B_B', '_B_'] };

/** 한 입씩 줄어드는 당근. 남은 조각은 늘 입에 붙어 있다. */
export const CARROT = {
  full: { x: 10, y: 9, rows: ['_OOOLL', 'OOOO_L'] },
  bitten: { x: 10, y: 9, rows: ['OOLL', 'OO_L'] },
  last: { x: 10, y: 9, rows: ['OLL', 'O_L'] },
} as const satisfies Record<string, Patch>;

/** 입가에 떨어지는 당근 부스러기 */
export const CRUMBS: readonly Patch[] = [
  { x: 9, y: 11, rows: ['O'] },
  { x: 10, y: 13, rows: ['O'] },
];

export const EATING = {
  bite: (carrot: Patch | null) => [...openEyes, nose, ...cheeks, mouthOpen, ...(carrot ? [carrot] : [])],
  chomp: (carrot: Patch | null) => [...happyEyes, nose, ...cheeks, chewFlat, ...(carrot ? [carrot] : [])],
  chew: (carrot: Patch | null) => [...happyEyes, nose, ...cheeks, chewRound, ...(carrot ? [carrot] : [])],
};

/** sad 상태에서 한 칸 아래로 흘러내린 눈물 */
export const TEARS_FALLEN: readonly Patch[] = [
  { x: 4, y: 8, rows: ['W', 'D'] },
  { x: 12, y: 8, rows: ['W', 'D'] },
];
