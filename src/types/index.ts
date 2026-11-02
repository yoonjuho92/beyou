import type { UIMessage } from 'ai';

/** tsundere: 좋으면서 아닌 척할 때 (칭찬·간식을 받았을 때 등) */
export const EMOTIONS = ['happy', 'sad', 'surprised', 'neutral', 'tsundere'] as const;
export type Emotion = (typeof EMOTIONS)[number];

/** 스트림의 start/finish 이벤트로 클라이언트에 전달되는 메시지 메타데이터 */
export type ChatMessageMetadata = {
  conversationId?: string;
  emotion?: Emotion;
};

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;
