import { describe, expect, it } from 'vitest';
import { parseEmotion, stripEmotionTag } from './emotion';

describe('emotion tag', () => {
  it('extracts the last tag and strips it from the body', () => {
    expect(parseEmotion('안녕하세요! 반가워요 뿌우.\n[emotion:happy]')).toEqual({
      content: '안녕하세요! 반가워요 뿌우.',
      emotion: 'happy',
    });
  });

  it('recognizes the tsundere emotion', () => {
    expect(parseEmotion('흥, 별로 안 좋아요.\n[emotion:tsundere]').emotion).toBe('tsundere');
  });

  it('falls back to neutral for missing or unknown tags', () => {
    expect(parseEmotion('그렇군요.').emotion).toBe('neutral');
    expect(parseEmotion('음.\n[emotion:angry]')).toEqual({ content: '음.', emotion: 'neutral' });
  });

  it('hides partial tags while streaming', () => {
    expect(stripEmotionTag('좋아요!\n[emo')).toBe('좋아요!');
    expect(stripEmotionTag('좋아요!\n[emotion:hap')).toBe('좋아요!');
    expect(stripEmotionTag('좋아요!\n[')).toBe('좋아요!');
  });
});
