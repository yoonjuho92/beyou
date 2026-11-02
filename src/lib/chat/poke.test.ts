import { describe, expect, it } from 'vitest';
import { pokeReaction } from './poke';

describe('pokeReaction', () => {
  it('never repeats the previous line', () => {
    let prev: string | null = null;
    for (let i = 0; i < 30; i++) {
      const { text } = pokeReaction([i * 10_000], prev);
      expect(text).not.toBe(prev);
      prev = text;
    }
  });

  it('gets annoyed when poked rapidly', () => {
    const times = [0, 500, 1000, 1500];
    const { text, emotion } = pokeReaction(times, null);
    expect(emotion).toBe('surprised');
    expect(['그만 좀 찔러!', '자꾸 그러면 화낸다.', '야, 진짜 그만해…', '털 빠진다고!']).toContain(text);
  });
});
