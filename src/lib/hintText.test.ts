import { describe, expect, it } from 'vitest';
import { looksLikeCharacterLine } from './hintText';

describe('looksLikeCharacterLine', () => {
  it('keeps casual user lines addressed to the character', () => {
    for (const t of ['비유야, 몽실계에도 비가 와?', '오늘 드디어 시험 끝났어!', '포근이는 어떤 양이야?', '나 오늘 회의 너무 길었어']) {
      expect(looksLikeCharacterLine(t), t).toBe(false);
    }
  });

  it("flags lines in the character's voice", () => {
    for (const t of ['저는 몽실계에서 왔어요', '오늘 하루는 어땠어요?', '(꼬리 살랑) 반가워', '당신은 어떤 사람이야?', '같이 놀자 뿌우']) {
      expect(looksLikeCharacterLine(t), t).toBe(true);
    }
  });
});
