import { BASE } from './base';
import { compose, type Patch } from './compose';
import { CARROT, CRUMBS, EATING, FACES, TEARS_FALLEN, THINKING_DOTS } from './faces';

export type LlamaState = 'idle' | 'thinking' | 'talking' | 'happy' | 'sad' | 'surprised' | 'eating';

export const LLAMA_STATES: readonly LlamaState[] = ['idle', 'thinking', 'talking', 'happy', 'sad', 'surprised', 'eating'];

/** 한 프레임의 지속 시간 단위 */
export const TICK_MS = 120;

type FrameSpec = { patches: readonly Patch[]; ticks: number };

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
  // 당근을 세 입에 나눠 먹고 오물오물 씹은 뒤 행복해한다 (약 4초, 반복). 간식 답변을 기다리는 동안 쓴다.
  eating: [
    { patches: EATING.bite(CARROT.full), ticks: 3 },
    { patches: EATING.chomp(CARROT.bitten), ticks: 2 },
    { patches: EATING.chew(CARROT.bitten), ticks: 2 },
    { patches: EATING.chomp(CARROT.bitten), ticks: 2 },
    { patches: EATING.bite(CARROT.bitten), ticks: 2 },
    { patches: [...EATING.chomp(CARROT.last), CRUMBS[0]], ticks: 2 },
    { patches: [...EATING.chew(CARROT.last), CRUMBS[1]], ticks: 2 },
    { patches: EATING.chomp(CARROT.last), ticks: 2 },
    { patches: EATING.bite(CARROT.last), ticks: 2 },
    { patches: [...EATING.chomp(null), ...CRUMBS], ticks: 2 },
    { patches: EATING.chew(null), ticks: 2 },
    { patches: EATING.chomp(null), ticks: 2 },
    { patches: EATING.chew(null), ticks: 2 },
    { patches: EATING.chomp(null), ticks: 2 },
    { patches: FACES.happy, ticks: 6 },
  ],
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
