import { useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { wsClient } from '../lib/websocket';
import { Sidebar } from '../components/Sidebar';
import { ChatWindow } from '../components/ChatWindow';
import { EmptyState } from '../components/EmptyState';
import { CallModal } from '../components/CallModal';

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  type: 'audio' | 'video';
}

export function ChatPage() {
  const activeChat = useChatStore((s) => s.activeChat);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    useChatStore.getState().loadChats();
    const cleanup = useChatStore.getState().initWsListeners();

    const unsubCall = wsClient.on('call:incoming', (data: any) => {
      setIncomingCall({
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerId,
        type: data.type,
      });

      const chats = useChatStore.getState().chats;
      for (const chat of chats) {
        const caller = chat.participants?.find((p: any) => p.id === data.callerId);
        if (caller) {
          setIncomingCall((prev) => prev ? { ...prev, callerName: caller.displayName || caller.username } : null);
          break;
        }
      }
    });

    return () => {
      cleanup();
      unsubCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = () => {
    setActiveChat(null);
  };

  // На мобильных показываем либо Sidebar, либо ChatWindow
  const showSidebar = !isMobile || !activeChat;
  const showChatArea = !isMobile || activeChat;

  return (
    <div className="h-full flex acid-bg">
      {showSidebar && (
        <div className={isMobile ? 'mobile-slide-left' : ''}>
          <Sidebar />
        </div>
      )}
      {showChatArea && (
        <div className={`flex-1 flex relative z-10 ${isMobile ? 'mobile-slide-right' : ''}`}>
          {activeChat ? <ChatWindow onBack={isMobile ? handleBack : undefined} /> : !isMobile && <EmptyState />}
        </div>
      )}

      {incomingCall && (
        <CallModal
          callId={incomingCall.callId}
          peerId={incomingCall.callerId}
          peerName={incomingCall.callerName}
          type={incomingCall.type}
          direction="incoming"
          onClose={() => setIncomingCall(null)}
        />
      )}
    </div>
  );
}
