import 'server-only';
import { createOpenAI } from '@ai-sdk/openai';
import OpenAI from 'openai';
import { serverEnv } from '@/lib/env.server';

let client: OpenAI | undefined;

/** 임베딩 등 직접 호출용 공식 SDK 클라이언트 */
export function openaiClient() {
  if (client) return client;
  const env = serverEnv();
  client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    organization: env.OPENAI_ORG_ID,
    project: env.OPENAI_PROJECT_ID,
  });
  return client;
}

/** AI SDK(streamText/generateText)용 채팅 모델. modelId를 생략하면 OPENAI_MODEL */
export function chatModel(modelId?: string) {
  const env = serverEnv();
  const provider = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
    organization: env.OPENAI_ORG_ID,
    project: env.OPENAI_PROJECT_ID,
  });
  return provider(modelId ?? env.OPENAI_MODEL);
}
