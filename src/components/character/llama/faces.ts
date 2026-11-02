import type { Patch } from './compose';

/**
 * 표정 오버레이. 좌표는 base.ts 기준 (x=열, y=행), '_'은 베이스 유지.
 * 범례: K 눈동자  H 하이라이트  B 입/눈썹  M 입 안쪽  P 볼/코  D 눈물  G 생각 점  O 당근  L 잎  V 잎맥  W 털(지우개)
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

  // 츤데레: 반쯤 감은 눈으로 옆(오른쪽)을 흘겨보고, 볼은 넓게 붉히고, 입은 한쪽으로 삐죽
  tsundere: [
    ...eyes(['BB', '_K']),
    nose,
    { x: 2, y: 8, rows: ['PPP'] },
    { x: 12, y: 8, rows: ['PPP'] },
    { x: 8, y: 9, rows: ['BBB', '___'] },
    { x: 7, y: 10, rows: ['B'] },
  ],

  // 츤데레가 슬쩍 정면을 볼 때: 눈은 그대로 반쯤 감고 눈동자만 가운데로
  tsundere_peek: [
    ...eyes(['BB', 'KK']),
    nose,
    { x: 2, y: 8, rows: ['PPP'] },
    { x: 12, y: 8, rows: ['PPP'] },
    { x: 8, y: 9, rows: ['BBB', '___'] },
    { x: 7, y: 10, rows: ['B'] },
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

/** 먹기(eating_*)용 얼굴 조각. 간식은 입(7~9열) 오른쪽에 물려 있다. */
const happyEyes = eyes(['_K_', 'K_K'], 3, 11);
const openEyes = eyes(['HK', 'KK']);
const mouthOpen: Patch = { x: 7, y: 9, rows: ['BBB', 'BMB', '_B_'] };
const chewFlat: Patch = { x: 7, y: 9, rows: ['BBB'] };
const chewRound: Patch = { x: 7, y: 9, rows: ['B_B', '_B_'] };

type TreatPieces = { full: Patch; bitten: Patch; last: Patch; crumbs: readonly Patch[] };

/**
 * 간식별로 한 입씩 줄어드는 조각과 부스러기. 남은 조각은 늘 입에 붙어 있다.
 * 키는 lib/chat/treat.ts의 TreatId와 같다.
 */
export const TREAT_PIECES = {
  // 주황 몸통 + 초록 잎
  carrot: {
    full: { x: 10, y: 9, rows: ['_OOOLL', 'OOOO_L'] },
    bitten: { x: 10, y: 9, rows: ['OOLL', 'OO_L'] },
    last: { x: 10, y: 9, rows: ['OLL', 'O_L'] },
    crumbs: [
      { x: 9, y: 11, rows: ['O'] },
      { x: 10, y: 13, rows: ['O'] },
    ],
  },
  // 위쪽이 톱니처럼 들쭉날쭉한 잎 + 진한 잎맥
  dandelion: {
    full: { x: 10, y: 9, rows: ['L_L_LL', 'VVVVVL'] },
    bitten: { x: 10, y: 9, rows: ['L_LL', 'VVVL'] },
    last: { x: 10, y: 9, rows: ['LL', 'VL'] },
    crumbs: [
      { x: 9, y: 11, rows: ['L'] },
      { x: 10, y: 13, rows: ['L'] },
    ],
  },
} as const satisfies Record<string, TreatPieces>;

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
