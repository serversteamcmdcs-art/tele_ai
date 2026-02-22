import { create } from 'zustand';
import { api } from '../lib/api';
import { wsClient } from '../lib/websocket';

interface ChatState {
  chats: any[];
  activeChat: any | null;
  messages: any[];
  typingUsers: Map<string, Set<string>>;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;

  loadChats: () => Promise<void>;
  setActiveChat: (chat: any) => void;
  loadMessages: (chatId: string) => Promise<void>;
  sendMessage: (text: string, replyToId?: string) => Promise<void>;
  createPrivateChat: (userId: string) => Promise<any>;
  createGroup: (title: string, participantIds: string[]) => Promise<any>;
  initWsListeners: () => () => void;
}

let _loadMessagesVersion = 0;

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  messages: [],
  typingUsers: new Map(),
  isLoadingChats: false,
  isLoadingMessages: false,

  loadChats: async () => {
    set({ isLoadingChats: true });
    const res = await api.getChats();
    if (res.success && res.data) {
      set({ chats: res.data, isLoadingChats: false });
    } else {
      set({ isLoadingChats: false });
    }
  },

  setActiveChat: (chat) => {
    set({ activeChat: chat, messages: [] });
    if (chat) {
      get().loadMessages(chat.id);
    }
  },

  loadMessages: async (chatId) => {
    const version = ++_loadMessagesVersion;
    set({ isLoadingMessages: true });
    const res = await api.getMessages(chatId);
    if (version !== _loadMessagesVersion) return;
    if (res.success && res.data) {
      set({ messages: res.data, isLoadingMessages: false });
    } else {
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (text, replyToId) => {
    const { activeChat } = get();
    if (!activeChat) return;

    wsClient.send({
      type: 'message:send',
      data: {
        chatId: activeChat.id,
        text,
        type: 'text',
        replyToId,
      },
    });
  },

  createPrivateChat: async (userId) => {
    const res = await api.createPrivateChat(userId);
    if (res.success && res.data) {
      await get().loadChats();
      return res.data;
    }
    return null;
  },

  createGroup: async (title, participantIds) => {
    const res = await api.createGroup(title, participantIds);
    if (res.success && res.data) {
      await get().loadChats();
      return res.data;
    }
    return null;
  },

  initWsListeners: () => {
    const unsubs: (() => void)[] = [];

    unsubs.push(wsClient.on('message:new', (data) => {
      const { activeChat, messages, chats } = get();

      // Если сообщение в активном чате — добавляем (с защитой от дублей)
      if (activeChat && data.chatId === activeChat.id) {
        const alreadyExists = messages.some((m) => m.id === data.id);
        if (!alreadyExists) {
          set({ messages: [...messages, data] });
        }

        // Отправить read
        wsClient.send({
          type: 'message:read',
          data: { chatId: data.chatId, messageId: data.id },
        });
      }

      // Обновить список чатов
      const chatExists = chats.some((c) => c.id === data.chatId);
      if (!chatExists) {
        // Новый чат — подгружаем весь список
        get().loadChats();
        return;
      }

      const updatedChats = chats.map((c) => {
        if (c.id === data.chatId) {
          return {
            ...c,
            lastMessage: data,
            unreadCount: activeChat?.id === data.chatId ? 0 : c.unreadCount + 1,
            updatedAt: data.createdAt,
          };
        }
        return c;
      });

      // Сортировка по последнему сообщению
      updatedChats.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      set({ chats: updatedChats });
    }));

    unsubs.push(wsClient.on('message:edited', (data) => {
      const { messages } = get();
      set({
        messages: messages.map((m) =>
          m.id === data.id ? { ...m, text: data.text, isEdited: true } : m,
        ),
      });
    }));

    unsubs.push(wsClient.on('message:deleted', (data) => {
      const { messages } = get();
      set({ messages: messages.filter((m) => m.id !== data.messageId) });
    }));

    unsubs.push(wsClient.on('message:reaction', (data) => {
      const { messages } = get();
      set({
        messages: messages.map((m) => {
          if (m.id !== data.messageId) return m;
          let reactions = [...(m.reactions || [])];
          if (data.action === 'add') {
            const existing = reactions.find((r: any) => r.emoji === data.emoji);
            if (existing) {
              existing.userIds = [...(existing.userIds || []), data.userId];
            } else {
              reactions.push({ emoji: data.emoji, userId: data.userId });
            }
          } else {
            reactions = reactions.filter(
              (r: any) => !(r.emoji === data.emoji && r.userId === data.userId),
            );
          }
          return { ...m, reactions };
        }),
      });
    }));

    unsubs.push(wsClient.on('typing:update', (data) => {
      const { typingUsers } = get();
      const chatTyping = new Map(typingUsers);
      if (!chatTyping.has(data.chatId)) {
        chatTyping.set(data.chatId, new Set());
      }
      const users = chatTyping.get(data.chatId)!;
      if (data.isTyping) {
        users.add(data.userId);
      } else {
        users.delete(data.userId);
      }
      set({ typingUsers: chatTyping });
    }));

    unsubs.push(wsClient.on('user:online', (data) => {
      const { chats } = get();
      set({
        chats: chats.map((c) => ({
          ...c,
          participants: c.participants?.map((p: any) =>
            p.id === data.userId ? { ...p, isOnline: true } : p,
          ),
        })),
      });
    }));

    unsubs.push(wsClient.on('user:offline', (data) => {
      const { chats } = get();
      set({
        chats: chats.map((c) => ({
          ...c,
          participants: c.participants?.map((p: any) =>
            p.id === data.userId ? { ...p, isOnline: false, lastSeen: data.lastSeen } : p,
          ),
        })),
      });
    }));

    return () => unsubs.forEach((u) => u());
  },
}));
