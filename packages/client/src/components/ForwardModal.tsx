import { useState } from 'react';
import { wsClient } from '../lib/websocket';
import { useAuthStore } from '../store/authStore';
import { Forward, Search, X } from 'lucide-react';

interface ForwardModalProps {
  message: any;
  chats: any[];
  onClose: () => void;
}

export function ForwardModal({ message, chats, onClose }: ForwardModalProps) {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [sent, setSent] = useState(false);

  const filteredChats = chats.filter((c) => {
    if (!search) return true;
    const title = c.title || '';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const handleForward = (chatId: string) => {
    wsClient.send({
      type: 'message:send',
      data: {
        chatId,
        text: message.text || undefined,
        type: message.type || 'text',
        mediaUrl: message.mediaUrl || undefined,
        forwardFromChatId: message.chatId,
        forwardFromMessageId: message.id,
      },
    });
    setSent(true);
    setTimeout(onClose, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong rounded-2xl w-96 max-h-[70vh] flex flex-col animate-bounce-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Forward className="w-5 h-5 text-acid-cyan" />
            <h2 className="text-lg font-bold text-white">Переслать сообщение</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/[0.08] text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Превью сообщения */}
        <div className="px-4 py-2 bg-black/20 border-b border-white/[0.06]">
          <div className="text-xs text-acid-cyan mb-0.5">{message.sender?.displayName || 'Пользователь'}</div>
          <div className="text-sm text-gray-300 truncate">{message.text || (message.mediaUrl ? 'Медиа' : '')}</div>
        </div>

        {/* Поиск */}
        <div className="p-3 border-b border-white/[0.06]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск чата..."
              autoFocus
              className="acid-input w-full pl-10 pr-4 py-2 bg-black/30 rounded-xl text-sm text-white placeholder-gray-500 border border-white/[0.06]"
            />
          </div>
        </div>

        {sent ? (
          <div className="flex items-center justify-center py-8 text-acid-green text-sm neon-text-green">
            Отправлено!
          </div>
        ) : (
          /* Список чатов */
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat) => {
              const otherUser = chat.type === 'private'
                ? chat.participants?.find((p: any) => p.id !== user?.id)
                : null;
              const title = chat.title || otherUser?.displayName || 'Чат';

              return (
                <button
                  key={chat.id}
                  onClick={() => handleForward(chat.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-acid-cyan/15 flex items-center justify-center text-acid-cyan font-medium flex-shrink-0">
                    {title[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{title}</div>
                    <div className="text-xs text-gray-500">
                      {chat.type === 'private' ? 'Личный чат' : chat.type === 'group' ? 'Группа' : 'Канал'}
                    </div>
                  </div>
                  <Forward className="w-4 h-4 text-gray-500" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
