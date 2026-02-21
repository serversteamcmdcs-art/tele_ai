import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import {
  Search,
  Settings,
  Plus,
  Users,
  Megaphone,
  MessageSquare,
  LogOut,
  Shield,
  Star,
  Camera,
  User,
  Save,
} from 'lucide-react';
import { NewChatModal } from './NewChatModal';

export function Sidebar() {
  const { chats, activeChat, setActiveChat, isLoadingChats } = useChatStore();
  const { user, logout, checkAuth } = useAuthStore();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const filteredChats = chats.filter((chat) => {
    if (!search) return !chat.isArchived;
    const title = chat.title || '';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'group': return <Users className="w-5 h-5" />;
      case 'channel': return <Megaphone className="w-5 h-5" />;
      case 'saved': return <Star className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <>
      <div className="w-80 h-full flex flex-col border-r border-white/[0.06] glass relative z-10">
        {/* Шапка */}
        <div className="p-3 flex items-center gap-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 rounded-full bg-acid-green/10 flex items-center justify-center hover:bg-acid-green/20 transition-colors"
          >
            <Shield className="w-5 h-5 text-acid-green" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="acid-input w-full pl-10 pr-4 py-2 bg-black/30 rounded-xl text-sm text-white placeholder-gray-500 border border-white/[0.06]"
            />
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-10 h-10 rounded-full bg-acid-cyan/15 flex items-center justify-center hover:bg-acid-cyan/25 transition-colors text-acid-cyan"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Выпадающее меню */}
        {showMenu && (
          <div className="mx-3 mb-2 glass-strong rounded-xl overflow-hidden animate-fade-in">
            <div className="p-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-acid-green/30" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-acid-green/15 flex items-center justify-center text-acid-green">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-white">{user?.displayName}</div>
                  <div className="text-sm text-gray-400">@{user?.username}</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setDisplayName(user?.displayName || '');
                setBio(user?.bio || '');
                setShowProfile(true);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-300 hover:bg-white/[0.06] transition-colors"
            >
              <Settings className="w-4 h-4 text-acid-cyan" />
              Настройки профиля
            </button>
            <button
              onClick={() => { logout(); setShowMenu(false); }}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-acid-pink hover:bg-white/[0.06] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        )}

        {/* Список чатов */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingChats ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              Загрузка чатов...
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              {search ? 'Ничего не найдено' : 'Нет чатов'}
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isActive = activeChat?.id === chat.id;
              const otherUser = chat.type === 'private'
                ? chat.participants?.find((p: any) => p.id !== user?.id)
                : null;

              return (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`w-full px-3 py-2.5 flex items-center gap-3 transition-all text-left ${
                    isActive
                      ? 'bg-acid-green/10 border-r-2 border-acid-green'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Аватар */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                      chat.type === 'saved'
                        ? 'bg-acid-cyan/20 text-acid-cyan'
                        : chat.type === 'channel'
                        ? 'bg-acid-pink/20 text-acid-pink'
                        : 'bg-white/[0.08]'
                    }`}>
                      {getChatIcon(chat.type) || (
                        <span className="text-lg">
                          {(chat.title || otherUser?.displayName || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    {otherUser?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 online-dot rounded-full border-2 border-[#0a0a14]" />
                    )}
                  </div>

                  {/* Инфо */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium truncate ${isActive ? 'text-acid-green' : 'text-gray-200'}`}>
                        {chat.title || otherUser?.displayName || 'Чат'}
                      </span>
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTime(chat.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-sm text-gray-400 truncate">
                        {chat.lastMessage?.text || (chat.type === 'saved' ? 'Ваши заметки' : 'Нет сообщений')}
                      </span>
                      {chat.unreadCount > 0 && (
                        <span className="flex-shrink-0 ml-2 min-w-[20px] h-5 px-1.5 flex items-center justify-center unread-badge rounded-full text-xs font-medium text-white">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Версия */}
        <div className="p-2 text-center text-xs text-gray-600">
          TeleAI <span className="text-acid-green/50">v1.0.0</span>
        </div>
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}

      {/* Модалка профиля */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowProfile(false)}>
          <div className="glass-strong rounded-2xl w-96 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4 neon-text-cyan">Настройки профиля</h2>

            {/* Аватарка */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative group">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAvatarUploading(true);
                    const uploadRes = await api.uploadFile(file);
                    if (uploadRes.success && uploadRes.data) {
                      await api.updateProfile({ avatarUrl: uploadRes.data.url });
                      await checkAuth();
                    }
                    setAvatarUploading(false);
                    e.target.value = '';
                  }}
                />
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover ring-2 ring-acid-green/30" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-acid-green/15 flex items-center justify-center text-acid-green">
                    <User className="w-10 h-10" />
                  </div>
                )}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {avatarUploading ? (
                    <span className="text-xs text-white">...</span>
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
              <span className="text-xs text-gray-400 mt-2">Нажмите для смены аватарки</span>
            </div>

            {/* Имя */}
            <label className="block mb-3">
              <span className="text-sm text-gray-400 mb-1 block">Отображаемое имя</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="acid-input w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm"
              />
            </label>

            {/* Био */}
            <label className="block mb-5">
              <span className="text-sm text-gray-400 mb-1 block">О себе</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="acid-input w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm resize-none"
              />
            </label>

            {/* Кнопки */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowProfile(false)}
                className="flex-1 py-2 rounded-lg bg-white/[0.06] text-gray-300 text-sm hover:bg-white/[0.1] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  await api.updateProfile({ displayName, bio });
                  await checkAuth();
                  setShowProfile(false);
                }}
                className="acid-btn flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
