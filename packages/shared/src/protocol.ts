// WebSocket протокол событий

// ==================== Клиент -> Сервер ====================

export type ClientEvent =
  | { type: 'message:send'; data: SendMessagePayload }
  | { type: 'message:edit'; data: EditMessagePayload }
  | { type: 'message:delete'; data: DeleteMessagePayload }
  | { type: 'message:read'; data: ReadMessagePayload }
  | { type: 'message:reaction'; data: ReactionPayload }
  | { type: 'typing:start'; data: TypingPayload }
  | { type: 'typing:stop'; data: TypingPayload }
  | { type: 'chat:create'; data: CreateChatPayload }
  | { type: 'user:status'; data: UserStatusPayload }
  | { type: 'call:initiate'; data: CallInitiatePayload }
  | { type: 'call:accept'; data: CallAnswerPayload }
  | { type: 'call:decline'; data: CallAnswerPayload }
  | { type: 'call:end'; data: CallAnswerPayload }
  | { type: 'call:signal'; data: CallSignalPayload }
  | { type: 'ping' };

// ==================== Сервер -> Клиент ====================

export type ServerEvent =
  | { type: 'message:new'; data: MessageEventData }
  | { type: 'message:edited'; data: MessageEventData }
  | { type: 'message:deleted'; data: MessageDeletedData }
  | { type: 'message:status'; data: MessageStatusData }
  | { type: 'message:reaction'; data: ReactionEventData }
  | { type: 'typing:update'; data: TypingEventData }
  | { type: 'chat:created'; data: ChatCreatedData }
  | { type: 'chat:updated'; data: ChatUpdatedData }
  | { type: 'user:online'; data: UserOnlineData }
  | { type: 'user:offline'; data: UserOfflineData }
  | { type: 'call:incoming'; data: CallIncomingData }
  | { type: 'call:accepted'; data: CallAnswerData }
  | { type: 'call:declined'; data: CallAnswerData }
  | { type: 'call:ended'; data: CallAnswerData }
  | { type: 'call:signal'; data: CallSignalData }
  | { type: 'message:pinned'; data: MessagePinnedData }
  | { type: 'message:unpinned'; data: MessageUnpinnedData }
  | { type: 'error'; data: ErrorData }
  | { type: 'pong' };

// ==================== Payloads ====================

export interface SendMessagePayload {
  chatId: string;
  text?: string;
  type: string;
  replyToId?: string;
  forwardFromChatId?: string;
  forwardFromMessageId?: string;
  mediaId?: string;
  scheduledAt?: string;
}

export interface EditMessagePayload {
  messageId: string;
  chatId: string;
  text: string;
}

export interface DeleteMessagePayload {
  messageId: string;
  chatId: string;
  forEveryone: boolean;
}

export interface ReadMessagePayload {
  chatId: string;
  messageId: string;
}

export interface ReactionPayload {
  messageId: string;
  chatId: string;
  emoji: string;
}

export interface TypingPayload {
  chatId: string;
}

export interface CreateChatPayload {
  type: 'private' | 'group' | 'channel';
  title?: string;
  participantIds: string[];
}

export interface UserStatusPayload {
  status: 'online' | 'offline';
}

export interface CallInitiatePayload {
  userId: string;
  type: 'audio' | 'video';
}

export interface CallAnswerPayload {
  callId: string;
}

export interface CallSignalPayload {
  callId: string;
  signal: unknown;
}

// ==================== Event Data ====================

export interface MessageEventData {
  id: string;
  chatId: string;
  senderId: string;
  type: string;
  text?: string;
  mediaUrl?: string;
  replyToId?: string;
  createdAt: string;
}

export interface MessageDeletedData {
  messageId: string;
  chatId: string;
}

export interface MessageStatusData {
  messageId: string;
  chatId: string;
  status: 'delivered' | 'read';
}

export interface ReactionEventData {
  messageId: string;
  chatId: string;
  userId: string;
  emoji: string;
  action: 'add' | 'remove';
}

export interface TypingEventData {
  chatId: string;
  userId: string;
  isTyping: boolean;
}

export interface ChatCreatedData {
  chatId: string;
  type: string;
  title?: string;
  participantIds: string[];
}

export interface ChatUpdatedData {
  chatId: string;
  changes: Record<string, unknown>;
}

export interface UserOnlineData {
  userId: string;
}

export interface UserOfflineData {
  userId: string;
  lastSeen: string;
}

export interface CallIncomingData {
  callId: string;
  callerId: string;
  type: 'audio' | 'video';
}

export interface CallAnswerData {
  callId: string;
}

export interface CallSignalData {
  callId: string;
  signal: unknown;
}

export interface MessagePinnedData {
  chatId: string;
  messageId: string;
  text?: string;
  senderName?: string;
}

export interface MessageUnpinnedData {
  chatId: string;
  messageId: string;
}

export interface ErrorData {
  code: string;
  message: string;
}
