// ==================== Пользователи ====================

export interface User {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  lastSeen?: Date;
  isOnline: boolean;
  createdAt: Date;
}

export interface UserProfile extends User {
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'tricolor';
  fontSize: 'small' | 'medium' | 'large';
  language: 'ru' | 'en';
  privacy: PrivacySettings;
  notifications: NotificationSettings;
}

export interface PrivacySettings {
  showLastSeen: 'everyone' | 'contacts' | 'nobody';
  showAvatar: 'everyone' | 'contacts' | 'nobody';
  showBio: 'everyone' | 'contacts' | 'nobody';
  allowCalls: 'everyone' | 'contacts' | 'nobody';
  allowGroupInvites: 'everyone' | 'contacts' | 'nobody';
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  preview: boolean;
}

// ==================== Авторизация ====================

export interface AuthRegisterRequest {
  username: string;
  password: string;
  displayName: string;
}

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ==================== Чаты ====================

export type ChatType = 'private' | 'group' | 'channel' | 'secret' | 'saved';

export interface Chat {
  id: string;
  type: ChatType;
  title?: string;
  avatarUrl?: string;
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Для личных чатов
  participants?: User[];
  // Для групп/каналов
  memberCount?: number;
  description?: string;
  inviteLink?: string;
}

export interface ChatFolder {
  id: string;
  name: string;
  filters: ChatFolderFilter;
  chatIds: string[];
}

export interface ChatFolderFilter {
  includeTypes?: ChatType[];
  excludeTypes?: ChatType[];
  includeUnread?: boolean;
}

// ==================== Сообщения ====================

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'video_note'
  | 'file'
  | 'sticker'
  | 'gif'
  | 'poll'
  | 'location'
  | 'contact'
  | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  media?: MediaAttachment;
  replyToId?: string;
  forwardedFrom?: ForwardInfo;
  reactions: Reaction[];
  status: MessageStatus;
  isEdited: boolean;
  isPinned: boolean;
  autoDeleteAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'voice' | 'video_note' | 'file' | 'sticker' | 'gif';
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface ForwardInfo {
  fromChatId: string;
  fromMessageId: string;
  fromSenderName: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
}

// ==================== Опросы ====================

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isAnonymous: boolean;
  isMultipleChoice: boolean;
  isClosed: boolean;
  totalVotes: number;
}

export interface PollOption {
  id: string;
  text: string;
  voterCount: number;
}

// ==================== Группы ====================

export type MemberRole = 'owner' | 'admin' | 'member';

export interface ChatMember {
  userId: string;
  chatId: string;
  role: MemberRole;
  permissions: MemberPermissions;
  joinedAt: Date;
}

export interface MemberPermissions {
  canSendMessages: boolean;
  canSendMedia: boolean;
  canSendStickers: boolean;
  canSendLinks: boolean;
  canInviteUsers: boolean;
  canPinMessages: boolean;
  canDeleteMessages: boolean;
  canBanUsers: boolean;
  canEditInfo: boolean;
}

// ==================== Звонки ====================

export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined';

export interface Call {
  id: string;
  type: CallType;
  callerId: string;
  receiverId: string;
  status: CallStatus;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}

// ==================== Стикеры ====================

export interface StickerPack {
  id: string;
  name: string;
  title: string;
  stickers: Sticker[];
  thumbnailUrl?: string;
  creatorId: string;
}

export interface Sticker {
  id: string;
  packId: string;
  emoji?: string;
  url: string;
  type: 'static' | 'animated' | 'video';
  width: number;
  height: number;
}

// ==================== Боты ====================

export interface Bot {
  id: string;
  username: string;
  displayName: string;
  description?: string;
  avatarUrl?: string;
  commands: BotCommand[];
  ownerId: string;
  token: string;
}

export interface BotCommand {
  command: string;
  description: string;
}

// ==================== API ответы ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
