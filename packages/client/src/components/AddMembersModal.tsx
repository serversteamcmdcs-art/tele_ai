import { useState } from 'react';
import { api } from '../lib/api';
import { X, Search, UserPlus } from 'lucide-react';

interface Props {
  chatId: string;
  chatType: 'group' | 'channel';
  onClose: () => void;
  onMembersAdded: () => void;
}

export function AddMembersModal({ chatId, chatType, onClose, onMembersAdded }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);

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

  const handleSelectUser = (user: any) => {
    const isSelected = selectedUsers.find((u) => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    setIsAdding(true);
    const res = await api.addMembersToChat(chatId, selectedUsers.map((u) => u.id));
    setIsAdding(false);

    if (res.success) {
      onMembersAdded();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md glass-strong rounded-2xl shadow-2xl animate-bounce-in">
        {/* Шапка */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold neon-text-cyan flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Добавить участников
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Выбранные пользователи */}
          {selectedUsers.length > 0 && (
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

          {/* Кнопка добавления */}
          <button
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0 || isAdding}
            className="acid-btn w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-30"
          >
            {isAdding ? 'Добавление...' : `Добавить ${selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
