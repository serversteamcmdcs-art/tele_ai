import { useEffect, useCallback } from 'react';
import { wsClient } from '../lib/websocket';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { chats, setActiveChat } = useChatStore();

  // Запрос разрешения на уведомления
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Функция показа уведомления
  const showNotification = useCallback((data: NotificationData) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        tag: data.tag,
      });

      if (data.onClick) {
        notification.onclick = () => {
          window.focus();
          data.onClick?.();
          notification.close();
        };
      }

      // Автоматически закрыть через 5 секунд
      setTimeout(() => notification.close(), 5000);
    }
  }, []);

  // Слушаем входящие звонки
  useEffect(() => {
    const unsub = wsClient.on('call:incoming', (data: any) => {
      // Находим информацию о звонящем
      const callerChat = chats.find((c: any) =>
        c.type === 'private' && c.participants?.some((p: any) => p.id === data.callerId)
      );
      const caller = callerChat?.participants?.find((p: any) => p.id === data.callerId);

      showNotification({
        title: `📞 ${caller?.displayName || 'Пользователь'}`,
        body: `Входящий ${data.type === 'video' ? 'видео' : 'аудио'} звонок`,
        tag: `call-${data.callId}`,
      });
    });

    return unsub;
  }, [chats, showNotification]);

  // Слушаем новые сообщения
  useEffect(() => {
    const unsub = wsClient.on('message:new', (data: any) => {
      // Не показываем уведомление для своих сообщений
      if (data._self) return;

      // Находим чат
      const chat = chats.find((c: any) => c.id === data.chatId);
      if (!chat) return;

      // Для приватных чатов
      if (chat.type === 'private') {
        const sender = chat.participants?.find((p: any) => p.id === data.senderId);
        showNotification({
          title: `💬 ${sender?.displayName || 'Пользователь'}`,
          body: data.text || (data.mediaUrl ? 'Медиа файл' : 'Новое сообщение'),
          icon: sender?.avatarUrl,
          tag: `chat-${data.chatId}`,
          onClick: () => setActiveChat(chat),
        });
      }
      // Для групп и каналов
      else if (chat.type === 'group' || chat.type === 'channel') {
        const senderName = data.sender?.displayName || 'Пользователь';
        showNotification({
          title: `💬 ${chat.title}`,
          body: `${senderName}: ${data.text || 'Медиа файл'}`,
          tag: `chat-${data.chatId}`,
          onClick: () => setActiveChat(chat),
        });
      }
    });

    return unsub;
  }, [chats, showNotification, setActiveChat]);

  // Слушаем добавление в чат
  useEffect(() => {
    const unsub = wsClient.on('chat:added', (data: any) => {
      const chatType = data.chatType === 'group' ? 'группу' : 'канал';
      showNotification({
        title: `🎉 Вас добавили в ${chatType}`,
        body: data.chatTitle || 'Новый чат',
        tag: `chat-added-${data.chatId}`,
      });
    });

    return unsub;
  }, [showNotification]);

  return <>{children}</>;
}
