// TeleAI Константы

export const APP_NAME = 'TeleAI';
export const APP_VERSION = '1.0.0';

// Сервер
export const DEFAULT_PORT = 3001;
export const DEFAULT_CLIENT_PORT = 5173;
export const API_PREFIX = '/api';

// Лимиты
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 МБ
export const MAX_MESSAGE_LENGTH = 4096;
export const MAX_BIO_LENGTH = 200;
export const MAX_USERNAME_LENGTH = 32;
export const MIN_USERNAME_LENGTH = 3;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_GROUP_MEMBERS = 10000;
export const MAX_PINNED_CHATS = 10;
export const MAX_STICKER_PACK_SIZE = 120;

// JWT
export const JWT_EXPIRES_IN = '7d';

// Автоудаление
export const AUTO_DELETE_OPTIONS = [
  { label: 'Выкл', value: 0 },
  { label: '1 день', value: 86400 },
  { label: '1 неделя', value: 604800 },
  { label: '1 месяц', value: 2592000 },
] as const;

// Цвета триколора
export const COLORS = {
  white: '#FFFFFF',
  blue: '#0039A6',
  red: '#D52B1E',
  darkBg: '#1A1A2E',
  darkSurface: '#16213E',
  darkAccent: '#0F3460',
  lightBg: '#F5F5F5',
  lightSurface: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

// Медиа типы
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'];
