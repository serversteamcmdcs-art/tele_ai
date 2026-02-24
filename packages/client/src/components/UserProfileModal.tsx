import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { wsClient } from '../lib/websocket';
import { X, User, Ban, UserX, MessageSquare, Calendar } from 'lucide-react';

interface Props {
  userId: string;
  onClose: () => void;
  onOpenChat?: (chat: any) => void;
}

export function UserProfileModal({ userId, onClose, onOpenChat }: Props) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      const res = await api.getUser(userId);
      if (res.success && res.data) {
        setUser(res.data);
      }
      setIsLoading(false);
    };
    loadUser();
  }, [userId]);

  // Слушаем обновления статуса в реальном времени
  useEffect(() => {
    const unsubOnline = wsClient.on('user:online', (data) => {
      if (data.userId === userId && user) {
        setUser({ ...user, isOnline: true });
      }
    });

    const unsubOffline = wsClient.on('user:offline', (data) => {
      if (data.userId === userId && user) {
        setUser({ ...user, isOnline: false, lastSeen: data.lastSeen });
      }
    });

    return () => {
      unsubOnline();
      unsubOffline();
    };
  }, [userId, user]);

  const handleBlock = async () => {
    setIsProcessing(true);
    if (isBlocked) {
      await api.unblockUser(userId);
      setIsBlocked(false);
    } else {
      await api.blockUser(userId);
      setIsBlocked(true);
    }
    setIsProcessing(false);
  };

  const handleStartChat = async () => {
    const res = await api.createPrivateChat(userId);
    if (res.success && res.data && onOpenChat) {
      onOpenChat(res.data);
      onClose();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="glass-strong rounded-2xl w-96 max-w-[90vw] overflow-hidden animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="relative h-24 bg-gradient-to-r from-acid-cyan/20 to-acid-green/20">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 hover:bg-black/50 transition-colors text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Контент */}
        <div className="px-6 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              Загрузка...
            </div>
          ) : !user ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              Пользователь не найден
            </div>
          ) : (
            <>
              {/* Аватар */}
              <div className="-mt-12 mb-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-[#0a0a14]"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-acid-green/15 flex items-center justify-center text-acid-green ring-4 ring-[#0a0a14]">
                    <User className="w-10 h-10" />
                  </div>
                )}
              </div>

              {/* Имя и статус */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white">{user.displayName}</h2>
                <div className="text-sm text-gray-400">@{user.username}</div>
                <div className="flex items-center gap-2 mt-1">
                  {user.isOnline ? (
                    <span className="text-sm text-acid-green flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-acid-green online-dot" />
                      в сети
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">
                      был(а) {formatDate(user.lastSeen)}
                    </span>
                  )}
                </div>
              </div>

              {/* Био */}
              {user.bio && (
                <div className="mb-4 p-3 bg-white/[0.03] rounded-xl">
                  <p className="text-sm text-gray-300">{user.bio}</p>
                </div>
              )}

              {/* Дата регистрации */}
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Зарегистрирован(а) {formatDate(user.createdAt)}</span>
              </div>

              {/* Кнопки действий */}
              <div className="space-y-2">
                <button
                  onClick={handleStartChat}
                  className="w-full py-2.5 rounded-xl bg-acid-green/15 text-acid-green hover:bg-acid-green/25 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <MessageSquare className="w-4 h-4" />
                  Написать сообщение
                </button>

                <button
                  onClick={handleBlock}
                  disabled={isProcessing}
                  className={`w-full py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium ${
                    isBlocked
                      ? 'bg-acid-green/15 text-acid-green hover:bg-acid-green/25'
                      : 'bg-acid-pink/15 text-acid-pink hover:bg-acid-pink/25'
                  }`}
                >
                  {isBlocked ? (
                    <>
                      <UserX className="w-4 h-4" />
                      Разблокировать
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      Заблокировать
                    </>
                  )}
                </button>
              </div>

              {isBlocked && (
                <p className="mt-3 text-xs text-center text-gray-500">
                  Пользователь заблокирован и не может отправлять вам сообщения
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
