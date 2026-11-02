import type { UIMessage } from 'ai';

export const EMOTIONS = ['happy', 'sad', 'surprised', 'neutral'] as const;
export type Emotion = (typeof EMOTIONS)[number];

/** 스트림의 start/finish 이벤트로 클라이언트에 전달되는 메시지 메타데이터 */
export type ChatMessageMetadata = {
  conversationId?: string;
  emotion?: Emotion;
};

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;
