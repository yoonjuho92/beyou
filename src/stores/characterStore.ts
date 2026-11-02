import { create } from 'zustand';
import type { LlamaState } from '@/components/character/llama/frames';
import type { Emotion } from '@/types';

type CharacterStore = {
  /** 표정/애니메이션 상태 */
  state: LlamaState;
  /** true면 비유가 제자리에 머물고 말풍선이 보인다 (생각·말하기·감정 표현 중) */
  stayPut: boolean;
  setState: (state: LlamaState) => void;
  /** 감정 표정과 말풍선을 holdMs 동안 보여준 뒤 idle로 돌아가 다시 돌아다닌다. */
  showEmotion: (emotion: Emotion, holdMs?: number) => void;
};

const EMOTION_TO_STATE: Record<Emotion, LlamaState> = {
  happy: 'happy',
  sad: 'sad',
  surprised: 'surprised',
  neutral: 'idle',
};

let resetTimer: ReturnType<typeof setTimeout> | undefined;

export const useCharacterStore = create<CharacterStore>((set) => ({
  state: 'idle',
  stayPut: false,
  setState: (state) => {
    clearTimeout(resetTimer);
    set({ state, stayPut: state !== 'idle' });
  },
  showEmotion: (emotion, holdMs = 3000) => {
    clearTimeout(resetTimer);
    set({ state: EMOTION_TO_STATE[emotion], stayPut: true });
    resetTimer = setTimeout(() => set({ state: 'idle', stayPut: false }), holdMs);
  },
}));
