import { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { api } from '../lib/api';
import { X, Search, User, Users, Megaphone } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function NewChatModal({ onClose }: Props) {
  const [tab, setTab] = useState<'private' | 'group' | 'channel'>('private');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const { createPrivateChat, createGroup, setActiveChat } = useChatStore();

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const res = await api.searchUsers(q);
    if (res.success && res.data) {
      setSearchResults(res.data);
    }
    setIsSearching(false);
  };

  const handleSelectUser = async (user: any) => {
    if (tab === 'private') {
      const chat = await createPrivateChat(user.id);
      if (chat) {
        setActiveChat(chat);
        onClose();
      }
    } else {
      const isSelected = selectedUsers.find((u) => u.id === user.id);
      if (isSelected) {
        setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
      } else {
        setSelectedUsers([...selectedUsers, user]);
      }
    }
  };

  const handleCreateGroup = async () => {
    if (!groupTitle.trim()) return;
    const chat = await createGroup(
      groupTitle,
      selectedUsers.map((u) => u.id),
    );
    if (chat) {
      setActiveChat(chat);
      onClose();
    }
  };

  const tabs = [
    { id: 'private' as const, label: 'Личный', icon: User },
    { id: 'group' as const, label: 'Группа', icon: Users },
    { id: 'channel' as const, label: 'Канал', icon: Megaphone },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md glass-strong rounded-2xl shadow-2xl animate-bounce-in">
        {/* Шапка */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold neon-text-cyan">Новый чат</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Табы */}
        <div className="flex border-b border-white/[0.06]">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm transition-colors ${
                tab === id
                  ? 'text-acid-green border-b-2 border-acid-green'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {/* Название группы/канала */}
          {(tab === 'group' || tab === 'channel') && (
            <input
              type="text"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder={tab === 'group' ? 'Название группы' : 'Название канала'}
              className="acid-input w-full px-4 py-2.5 bg-black/30 border border-white/[0.06] rounded-xl text-white placeholder-gray-500 text-sm"
            />
          )}

          {/* Выбранные пользователи */}
          {tab === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className="px-2.5 py-1 bg-acid-green/15 text-acid-green rounded-full text-xs cursor-pointer hover:bg-acid-green/25 transition-colors"
                >
                  {u.displayName} ×
                </span>
              ))}
            </div>
          )}

          {/* Поиск */}
          {tab !== 'channel' && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Поиск пользователей..."
                  className="acid-input w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/[0.06] rounded-xl text-white placeholder-gray-500 text-sm"
                  autoFocus
                />
              </div>

              {/* Результаты */}
              <div className="max-h-64 overflow-y-auto space-y-1">
                {isSearching ? (
                  <div className="text-center py-4 text-gray-500 text-sm">Поиск...</div>
                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">Никого не найдено</div>
                ) : (
                  searchResults.map((u) => {
                    const isSelected = selectedUsers.find((s) => s.id === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                          isSelected ? 'bg-acid-green/15 neon-border-green' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-acid-cyan/15 flex items-center justify-center text-acid-cyan font-medium">
                          {u.displayName[0].toUpperCase()}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-white">{u.displayName}</div>
                          <div className="text-xs text-gray-400">@{u.username}</div>
                        </div>
                        {u.isOnline && (
                          <div className="ml-auto w-2 h-2 rounded-full online-dot" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Кнопка создания группы/канала */}
          {(tab === 'group' || tab === 'channel') && (
            <button
              onClick={handleCreateGroup}
              disabled={!groupTitle.trim()}
              className="acid-btn w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-30"
            >
              {tab === 'group' ? 'Создать группу' : 'Создать канал'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
