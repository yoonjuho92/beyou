import 'server-only';
import { serverEnv } from '@/lib/env.server';
import { openaiClient } from '@/lib/openai';

const MAX_BATCH = 100;

export type Embedding = number[];

/** pgvector 컬럼/RPC 인자로 넘길 문자열 표현 */
export function toPgVector(embedding: Embedding): string {
  return `[${embedding.join(',')}]`;
}

export async function embedBatch(inputs: string[]): Promise<Embedding[]> {
  if (inputs.length === 0) return [];
  const env = serverEnv();
  const result: Embedding[] = [];

  for (let i = 0; i < inputs.length; i += MAX_BATCH) {
    const batch = inputs.slice(i, i + MAX_BATCH);
    const res = await openaiClient().embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: batch,
      dimensions: env.EMBEDDING_DIMENSIONS,
    });
    const ordered = [...res.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
    for (const e of ordered) {
      if (e.length !== env.EMBEDDING_DIMENSIONS) {
        throw new Error(`임베딩 차원 불일치: ${e.length} != EMBEDDING_DIMENSIONS(${env.EMBEDDING_DIMENSIONS})`);
      }
    }
    result.push(...ordered);
  }
  return result;
}

export async function embedText(input: string): Promise<Embedding> {
  const [embedding] = await embedBatch([input]);
  return embedding;
}
