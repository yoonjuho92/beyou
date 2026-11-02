import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { fitToTokenBudget, selectMemories } = await import('./retrieve');

describe('fitToTokenBudget', () => {
  it('drops the least similar hits first and preserves order', () => {
    const long = 'word '.repeat(50);
    const hits = [
      { id: 'a', content: long, similarity: 0.4 },
      { id: 'b', content: long, similarity: 0.9 },
      { id: 'c', content: long, similarity: 0.7 },
    ];
    expect(fitToTokenBudget(hits, 110).map((h) => h.id)).toEqual(['b', 'c']);
  });
});

describe('selectMemories', () => {
  it('drops memories that overlap the recent history window', () => {
    const mem = (id: string, createdAt: string) => ({ id, content: id, createdAt, similarity: 0.5 });
    const picked = selectMemories([mem('old', '2026-01-01T00:00:00Z'), mem('recent', '2026-01-02T00:00:00Z')], {
      excludeSince: '2026-01-01T12:00:00Z',
      topK: 5,
      maxTokens: 1000,
    });
    expect(picked.map((m) => m.id)).toEqual(['old']);
  });
});
