import { BASE } from './base';
import { compose, type Patch } from './compose';
import { EATING, FACES, TEARS_FALLEN, THINKING_DOTS, TREAT_PIECES } from './faces';

export type LlamaState =
  | 'idle'
  | 'thinking'
  | 'talking'
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'tsundere'
  | 'eating_carrot'
  | 'eating_dandelion';

export const LLAMA_STATES: readonly LlamaState[] = [
  'idle',
  'thinking',
  'talking',
  'happy',
  'sad',
  'surprised',
  'tsundere',
  'eating_carrot',
  'eating_dandelion',
];

/** 한 프레임의 지속 시간 단위 */
export const TICK_MS = 120;

type FrameSpec = { patches: readonly Patch[]; ticks: number };

/** 간식을 세 입에 나눠 먹고 오물오물 씹은 뒤 행복해한다 (약 4초, 반복). 간식 답변을 기다리는 동안 쓴다. */
function eating({ full, bitten, last, crumbs }: (typeof TREAT_PIECES)[keyof typeof TREAT_PIECES]): FrameSpec[] {
  return [
    { patches: EATING.bite(full), ticks: 3 },
    { patches: EATING.chomp(bitten), ticks: 2 },
    { patches: EATING.chew(bitten), ticks: 2 },
    { patches: EATING.chomp(bitten), ticks: 2 },
    { patches: EATING.bite(bitten), ticks: 2 },
    { patches: [...EATING.chomp(last), crumbs[0]], ticks: 2 },
    { patches: [...EATING.chew(last), crumbs[1]], ticks: 2 },
    { patches: EATING.chomp(last), ticks: 2 },
    { patches: EATING.bite(last), ticks: 2 },
    { patches: [...EATING.chomp(null), ...crumbs], ticks: 2 },
    { patches: EATING.chew(null), ticks: 2 },
    { patches: EATING.chomp(null), ticks: 2 },
    { patches: EATING.chew(null), ticks: 2 },
    { patches: EATING.chomp(null), ticks: 2 },
    { patches: FACES.happy, ticks: 6 },
  ];
}

const SEQUENCES: Record<LlamaState, readonly FrameSpec[]> = {
  idle: [
    { patches: FACES.idle, ticks: 60 },
    { patches: FACES.blink, ticks: 4 },
  ],
  thinking: [
    { patches: FACES.thinking, ticks: 3 },
    { patches: [...FACES.thinking, THINKING_DOTS[0]], ticks: 3 },
    { patches: [...FACES.thinking, ...THINKING_DOTS.slice(0, 2)], ticks: 3 },
    { patches: [...FACES.thinking, ...THINKING_DOTS], ticks: 4 },
  ],
  talking: [
    { patches: FACES.talking_open, ticks: 2 },
    { patches: FACES.talking_closed, ticks: 2 },
  ],
  happy: [
    { patches: FACES.happy, ticks: 30 },
    { patches: FACES.blink, ticks: 3 },
  ],
  sad: [
    { patches: FACES.sad, ticks: 6 },
    { patches: [...FACES.sad, ...TEARS_FALLEN], ticks: 6 },
  ],
  surprised: [{ patches: FACES.surprised, ticks: 1 }],
  // 고개 돌린 채 흘겨보다가, 가끔 슬쩍 정면을 봤다가 다시 외면한다
  tsundere: [
    { patches: FACES.tsundere, ticks: 22 },
    { patches: FACES.tsundere_peek, ticks: 5 },
    { patches: FACES.tsundere, ticks: 14 },
    { patches: FACES.blink, ticks: 2 },
  ],
  eating_carrot: eating(TREAT_PIECES.carrot),
  eating_dandelion: eating(TREAT_PIECES.dandelion),
};

/** 상태별로 합성이 끝난 24×24 프레임 목록. 틱 단위로 펼쳐 두어 인덱스로 바로 조회한다. */
export type Frame = readonly string[];

function expand(seq: readonly FrameSpec[]): Frame[] {
  return seq.flatMap(({ patches, ticks }) => {
    const grid = compose(BASE, patches);
    return Array.from({ length: ticks }, () => grid);
  });
}

export const FRAMES: Record<LlamaState, Frame[]> = Object.fromEntries(
  LLAMA_STATES.map((s) => [s, expand(SEQUENCES[s])]),
) as Record<LlamaState, Frame[]>;
