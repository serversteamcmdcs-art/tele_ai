import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { wsClient } from '../lib/websocket';
import { api } from '../lib/api';
import { CallModal } from './CallModal';
import { ForwardModal } from './ForwardModal';
import {
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  Reply,
  ArrowDown,
  Check,
  CheckCheck,
  X,
  Image,
  FileText,
  Pin,
  Search,
  ChevronUp,
  ChevronDown,
  Mic,
  Square,
  Play,
  Pause,
  Forward,
  Trash2,
  Edit3,
  Copy,
} from 'lucide-react';

const EMOJI_LIST = [
  '\u{1F600}','\u{1F602}','\u{1F923}','\u{1F60A}','\u{1F60D}','\u{1F970}','\u{1F618}','\u{1F60E}','\u{1F914}','\u{1F60F}',
  '\u{1F622}','\u{1F62D}','\u{1F621}','\u{1F92F}','\u{1F973}','\u{1F634}','\u{1F92E}','\u{1F44D}','\u{1F44E}','\u2764\uFE0F',
  '\u{1F525}','\u2B50','\u{1F4AF}','\u{1F389}','\u{1F44B}','\u{1F64F}','\u{1F4AA}','\u{1F1F7}\u{1F1FA}','\u26A1','\u2705',
];

export function ChatWindow() {
  const { activeChat, messages, isLoadingMessages, sendMessage, chats } = useChatStore();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachPreview, setAttachPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [callState, setCallState] = useState<{callId:string;type:'audio'|'video'}|null>(null);

  // Пин
  const [pinnedMessage, setPinnedMessage] = useState<any>(null);

  // Поиск
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Контекстное меню
  const [contextMenu, setContextMenu] = useState<{x:number;y:number;msg:any}|null>(null);

  // Пересылка
  const [forwardMsg, setForwardMsg] = useState<any>(null);

  // Голосовые
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval>>();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeChat?.id]);

  // Загрузка закреплённого сообщения при смене чата
  useEffect(() => {
    if (!activeChat?.id) return;
    setPinnedMessage(null);
    api.getPinnedMessage(activeChat.id).then((res) => {
      if (res.success && res.data) {
        setPinnedMessage(res.data.message);
      }
    });
  }, [activeChat?.id]);

  // WS-слушатели для пина
  useEffect(() => {
    const unsubPin = wsClient.on('message:pinned', (data: any) => {
      if (data.chatId === activeChat?.id) {
        setPinnedMessage({ id: data.messageId, text: data.text, sender: { displayName: data.senderName } });
      }
    });
    const unsubUnpin = wsClient.on('message:unpinned', (data: any) => {
      if (data.chatId === activeChat?.id) {
        setPinnedMessage(null);
      }
    });
    return () => { unsubPin(); unsubUnpin(); };
  }, [activeChat?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-acid-green/50');
      setTimeout(() => el.classList.remove('ring-2', 'ring-acid-green/50'), 2000);
    }
  };

  // Закрытие эмодзи по клику вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
      setContextMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachment(file);
    if (file.type.startsWith('image/')) {
      setAttachPreview(URL.createObjectURL(file));
    } else {
      setAttachPreview(null);
    }
    e.target.value = '';
  };

  const removeAttachment = () => {
    if (attachPreview) URL.revokeObjectURL(attachPreview);
    setAttachment(null);
    setAttachPreview(null);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    if (attachment) {
      mediaType = attachment.type.startsWith('image/') ? 'image' : 'file';
      setUploading(true);
      const res = await api.uploadFile(attachment);
      setUploading(false);
      if (res.success && res.data) {
        mediaUrl = res.data.url;
      }
      removeAttachment();
    }

    if (mediaUrl) {
      wsClient.send({
        type: 'message:send',
        data: {
          chatId: activeChat.id,
          text: trimmed || undefined,
          type: mediaType,
          mediaUrl,
          replyToId: replyTo?.id,
        },
      });
    } else if (trimmed) {
      sendMessage(trimmed, replyTo?.id);
    }

    setText('');
    setReplyTo(null);
    wsClient.send({ type: 'typing:stop', data: { chatId: activeChat.id } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (value: string) => {
    setText(value);
    if (value.length > 0) {
      wsClient.send({ type: 'typing:start', data: { chatId: activeChat.id } });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        wsClient.send({ type: 'typing:stop', data: { chatId: activeChat.id } });
      }, 3000);
    } else {
      wsClient.send({ type: 'typing:stop', data: { chatId: activeChat.id } });
    }
  };

  // === Поиск ===
  const doSearch = useCallback(async () => {
    if (!activeChat?.id || !searchQuery.trim()) { setSearchResults([]); return; }
    const res = await api.searchMessages(activeChat.id, searchQuery.trim());
    if (res.success && res.data) {
      setSearchResults(res.data);
      setSearchIndex(0);
      if (res.data.length > 0) scrollToMessage(res.data[0].id);
    }
  }, [activeChat?.id, searchQuery]);

  useEffect(() => {
    const timeout = setTimeout(doSearch, 400);
    return () => clearTimeout(timeout);
  }, [doSearch]);

  const navigateSearch = (dir: 'up' | 'down') => {
    if (searchResults.length === 0) return;
    let next = dir === 'up' ? searchIndex - 1 : searchIndex + 1;
    if (next < 0) next = searchResults.length - 1;
    if (next >= searchResults.length) next = 0;
    setSearchIndex(next);
    scrollToMessage(searchResults[next].id);
  };

  // === Контекстное меню ===
  const handleContextMenu = (e: React.MouseEvent, msg: any) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
  };

  const handlePin = async () => {
    if (!contextMenu || !activeChat) return;
    await api.togglePin(activeChat.id, contextMenu.msg.id);
    setContextMenu(null);
  };

  const handleCopy = () => {
    if (!contextMenu?.msg?.text) return;
    navigator.clipboard.writeText(contextMenu.msg.text);
    setContextMenu(null);
  };

  const handleDelete = async () => {
    if (!contextMenu || !activeChat) return;
    wsClient.send({
      type: 'message:delete',
      data: { messageId: contextMenu.msg.id, chatId: activeChat.id, forEveryone: true },
    });
    setContextMenu(null);
  };

  // === Голосовые ===
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        setUploading(true);
        const res = await api.uploadFile(file);
        setUploading(false);
        if (res.success && res.data) {
          wsClient.send({
            type: 'message:send',
            data: {
              chatId: activeChat.id,
              type: 'voice',
              mediaUrl: res.data.url,
            },
          });
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {};
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setRecordingTime(0);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  const formatRecTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const otherUser = activeChat?.type === 'private'
    ? activeChat.participants?.find((p: any) => p.id !== user?.id)
    : null;
  const otherUserId = otherUser?.id;

  // Слушаем call:created
  useEffect(() => {
    const unsub = wsClient.on('call:created', (data: any) => {
      setCallState({ callId: data.callId, type: data.type });
    });
    return unsub;
  }, []);

  const startCall = (callType: 'audio' | 'video') => {
    if (!otherUserId) return;
    wsClient.send({ type: 'call:initiate', data: { userId: otherUserId, type: callType } });
  };

  const chatTitle = activeChat?.title || otherUser?.displayName || 'Чат';
  const chatSubtitle = activeChat?.type === 'private'
    ? otherUser?.isOnline
      ? 'в сети'
      : otherUser?.lastSeen
        ? `был(а) ${new Date(otherUser.lastSeen).toLocaleString('ru-RU')}`
        : ''
    : `${activeChat?.memberCount || 0} участников`;

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Группировка сообщений по дате
  const groupedMessages: { date: string; messages: any[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msg.createdAt, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  // Подсветка поиска
  const highlightText = (msgText: string, msgId: string) => {
    if (!showSearch || !searchQuery.trim()) return msgText;
    const isResultMsg = searchResults.some((r) => r.id === msgId);
    if (!isResultMsg) return msgText;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = msgText.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-acid-yellow/40 text-white rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Шапка чата */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.06] glass flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-acid-cyan/15 flex items-center justify-center text-acid-cyan font-medium">
            {chatTitle[0].toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-white">{chatTitle}</div>
            <div className="text-xs text-gray-400">
              {otherUser?.isOnline && <span className="text-acid-green">{chatSubtitle}</span>}
              {!otherUser?.isOnline && chatSubtitle}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); setSearchResults([]); }} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-400 hover:text-acid-cyan">
            <Search className="w-5 h-5" />
          </button>
          {activeChat?.type === 'private' && (
            <>
              <button onClick={() => startCall('audio')} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-400 hover:text-acid-green">
                <Phone className="w-5 h-5" />
              </button>
              <button onClick={() => startCall('video')} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-400 hover:text-acid-pink">
                <Video className="w-5 h-5" />
              </button>
            </>
          )}
          <button className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-400 hover:text-white">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Поиск */}
      {showSearch && (
        <div className="px-4 py-2 glass border-b border-white/[0.06] flex items-center gap-2 animate-fade-in">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск сообщений..."
            autoFocus
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
          />
          {searchResults.length > 0 && (
            <span className="text-xs text-acid-green flex-shrink-0">{searchIndex + 1}/{searchResults.length}</span>
          )}
          <button onClick={() => navigateSearch('up')} className="p-1 rounded hover:bg-white/[0.06] text-gray-400"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={() => navigateSearch('down')} className="p-1 rounded hover:bg-white/[0.06] text-gray-400"><ChevronDown className="w-4 h-4" /></button>
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} className="p-1 rounded hover:bg-white/[0.06] text-gray-400"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Закреплённое сообщение */}
      {pinnedMessage && (
        <button
          onClick={() => scrollToMessage(pinnedMessage.id)}
          className="px-4 py-2 glass border-b border-white/[0.06] flex items-center gap-3 hover:bg-white/[0.04] transition-colors text-left w-full"
        >
          <Pin className="w-4 h-4 text-acid-cyan flex-shrink-0 rotate-45" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-acid-cyan">Закреплённое сообщение</div>
            <div className="text-xs text-gray-400 truncate">{pinnedMessage.text || 'Медиа'}</div>
          </div>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await api.togglePin(activeChat.id, pinnedMessage.id);
              setPinnedMessage(null);
            }}
            className="p-1 rounded hover:bg-white/[0.1] text-gray-500 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </button>
      )}

      {/* Сообщения */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2"
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Загрузка сообщений...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Нет сообщений. Начните общение!
          </div>
        ) : (
          groupedMessages.map((group, gi) => (
            <div key={gi}>
              {/* Разделитель даты */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 glass rounded-full text-xs text-gray-400">
                  {formatDate(group.date)}
                </span>
              </div>

              {/* Сообщения */}
              {group.messages.map((msg) => {
                const isMine = msg.senderId === user?.id || msg.sender?.id === user?.id;
                const senderName = msg.sender?.displayName || 'Пользователь';

                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                    className={`flex mb-1 message-enter ${isMine ? 'justify-end' : 'justify-start'} transition-all duration-300`}
                  >
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-2xl group relative ${
                        isMine
                          ? 'msg-mine rounded-br-md'
                          : 'msg-other rounded-bl-md'
                      }`}
                    >
                      {/* Пересланное */}
                      {msg.forwardFromSender && (
                        <div className="text-xs italic text-acid-cyan/70 mb-0.5 flex items-center gap-1">
                          <Forward className="w-3 h-3" />
                          Переслано от {msg.forwardFromSender}
                        </div>
                      )}

                      {/* Имя отправителя в группах */}
                      {!isMine && activeChat?.type !== 'private' && (
                        <div className="text-xs font-medium text-acid-pink mb-0.5">
                          {senderName}
                        </div>
                      )}

                      {/* Reply */}
                      {msg.replyTo && (
                        <div className="mb-1 pl-2 border-l-2 border-acid-green/40 text-xs opacity-70">
                          <div className="font-medium text-acid-green">{msg.replyTo.sender?.displayName}</div>
                          <div className="truncate">{msg.replyTo.text}</div>
                        </div>
                      )}

                      {/* Медиа */}
                      {msg.mediaUrl && msg.type === 'image' && (
                        <img src={msg.mediaUrl} alt="" className="max-w-full rounded-lg mb-1 max-h-64 object-cover" />
                      )}
                      {msg.mediaUrl && msg.type === 'file' && (
                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-black/20 rounded-lg mb-1 hover:bg-black/30 transition-colors">
                          <FileText className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm underline truncate">Файл</span>
                        </a>
                      )}

                      {/* Голосовое сообщение */}
                      {msg.mediaUrl && msg.type === 'voice' && (
                        <VoicePlayer src={msg.mediaUrl} isMine={isMine} />
                      )}

                      {/* Текст */}
                      {msg.text && (
                        <div className="whitespace-pre-wrap break-words text-sm">
                          {highlightText(msg.text, msg.id)}
                        </div>
                      )}

                      {/* Время и статус */}
                      <div className={`flex items-center justify-end gap-1 mt-0.5 ${
                        isMine ? 'text-acid-green/50' : 'text-gray-500'
                      }`}>
                        {msg.isEdited && <span className="text-[10px]">ред.</span>}
                        <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                        {isMine && (
                          <CheckCheck className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Действия при наведении */}
                      <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                        <button
                          onClick={() => setReplyTo(msg)}
                          className="p-1 rounded bg-black/40 hover:bg-black/60 transition-colors"
                          title="Ответить"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setForwardMsg(msg)}
                          className="p-1 rounded bg-black/40 hover:bg-black/60 transition-colors"
                          title="Переслать"
                        >
                          <Forward className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Контекстное меню */}
      {contextMenu && (
        <div
          className="fixed z-[100] glass-strong rounded-xl shadow-2xl py-1 min-w-[180px] animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }}
            className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.06] flex items-center gap-3 transition-colors">
            <Reply className="w-4 h-4 text-acid-cyan" /> Ответить
          </button>
          <button onClick={() => { setForwardMsg(contextMenu.msg); setContextMenu(null); }}
            className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.06] flex items-center gap-3 transition-colors">
            <Forward className="w-4 h-4 text-acid-cyan" /> Переслать
          </button>
          {contextMenu.msg.text && (
            <button onClick={handleCopy}
              className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.06] flex items-center gap-3 transition-colors">
              <Copy className="w-4 h-4 text-acid-green" /> Копировать
            </button>
          )}
          <button onClick={handlePin}
            className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.06] flex items-center gap-3 transition-colors">
            <Pin className="w-4 h-4 text-acid-yellow" /> {pinnedMessage?.id === contextMenu.msg.id ? 'Открепить' : 'Закрепить'}
          </button>
          {(contextMenu.msg.senderId === user?.id || contextMenu.msg.sender?.id === user?.id) && (
            <button onClick={handleDelete}
              className="w-full px-4 py-2 text-sm text-acid-pink hover:bg-white/[0.06] flex items-center gap-3 transition-colors">
              <Trash2 className="w-4 h-4" /> Удалить
            </button>
          )}
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 glass border-t border-white/[0.06] flex items-center gap-3">
          <div className="w-1 h-8 bg-acid-green rounded-full shadow-neon-green" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-acid-green">
              {replyTo.sender?.displayName || 'Пользователь'}
            </div>
            <div className="text-xs text-gray-400 truncate">{replyTo.text}</div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-gray-500 hover:text-white text-lg"
          >
            ×
          </button>
        </div>
      )}

      {/* Превью вложения */}
      {attachment && (
        <div className="px-4 py-2 glass border-t border-white/[0.06] flex items-center gap-3">
          {attachPreview ? (
            <img src={attachPreview} alt="" className="w-12 h-12 rounded-lg object-cover ring-1 ring-acid-green/30" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate">{attachment.name}</div>
            <div className="text-xs text-gray-400">{(attachment.size / 1024).toFixed(1)} КБ</div>
          </div>
          <button onClick={removeAttachment} className="text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Ввод сообщения */}
      <div className="p-3 glass border-t border-white/[0.06] flex-shrink-0">
        {isRecording ? (
          /* Индикатор записи */
          <div className="flex items-center gap-3">
            <button onClick={cancelRecording} className="p-2 rounded-lg hover:bg-white/[0.06] text-acid-pink transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <div className="w-3 h-3 bg-acid-pink rounded-full recording-pulse" />
              <span className="text-sm text-white font-mono neon-text-pink">{formatRecTime(recordingTime)}</span>
              <div className="flex-1 flex items-center gap-0.5">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-acid-green rounded-full"
                    style={{ height: `${8 + Math.random() * 16}px`, animation: 'typingBounce 0.8s infinite', animationDelay: `${i * 0.05}s` }}
                  />
                ))}
              </div>
            </div>
            <button onClick={stopRecording} className="p-2.5 rounded-xl bg-acid-green text-black hover:shadow-neon-green transition-all">
              <Send className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* Обычный ввод */
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-400 hover:text-acid-cyan flex-shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => handleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Сообщение..."
                rows={1}
                className="acid-input w-full px-4 py-2.5 bg-black/30 border border-white/[0.06] rounded-xl text-white placeholder-gray-500 resize-none text-sm max-h-32"
                style={{ minHeight: '42px' }}
              />
            </div>
            <div className="relative" ref={emojiRef}>
              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className={`p-2 rounded-lg hover:bg-white/[0.06] transition-colors flex-shrink-0 ${showEmoji ? 'text-acid-yellow' : 'text-gray-400 hover:text-acid-yellow'}`}
              >
                <Smile className="w-5 h-5" />
              </button>
              {showEmoji && (
                <div className="absolute bottom-10 right-0 glass-strong rounded-xl p-2 shadow-xl z-50 w-64">
                  <div className="grid grid-cols-6 gap-1">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => { setText((t) => t + emoji); inputRef.current?.focus(); }}
                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {text.trim() || attachment ? (
              <button
                onClick={handleSend}
                disabled={uploading}
                className="p-2.5 rounded-xl bg-acid-green text-black hover:shadow-neon-green transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onMouseDown={startRecording}
                className="p-2.5 rounded-xl bg-acid-pink text-white hover:shadow-neon-pink transition-all flex-shrink-0"
                title="Голосовое сообщение"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Модалка звонка */}
      {callState && otherUser && (
        <CallModal
          callId={callState.callId}
          peerId={otherUser.id}
          peerName={otherUser.displayName || otherUser.username || 'Пользователь'}
          type={callState.type}
          direction="outgoing"
          onClose={() => setCallState(null)}
        />
      )}

      {/* Модалка пересылки */}
      {forwardMsg && (
        <ForwardModal
          message={forwardMsg}
          chats={chats}
          onClose={() => setForwardMsg(null)}
        />
      )}
    </div>
  );
}

// ====== Компонент аудиоплеера для голосовых ======
function VoicePlayer({ src, isMine }: { src: string; isMine: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const formatT = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle} className={`p-1.5 rounded-full transition-colors ${
        isMine ? 'bg-black/20 hover:bg-black/30' : 'bg-white/[0.06] hover:bg-white/[0.1]'
      }`}>
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="flex-1">
        <div className={`h-1 rounded-full overflow-hidden ${isMine ? 'bg-black/20' : 'bg-white/[0.1]'}`}>
          <div className={`h-full rounded-full transition-all ${isMine ? 'bg-acid-green/70' : 'bg-acid-cyan'}`} style={{ width: `${progress}%` }} />
        </div>
        <div className={`text-[10px] mt-0.5 ${isMine ? 'text-acid-green/50' : 'text-gray-500'}`}>{formatT(playing ? currentTime : duration)}</div>
      </div>
    </div>
  );
}
