import { useState, useEffect, useRef, useCallback } from 'react';
import { wsClient } from '../lib/websocket';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  X,
} from 'lucide-react';

interface CallModalProps {
  callId: string;
  peerId: string;
  peerName: string;
  type: 'audio' | 'video';
  direction: 'outgoing' | 'incoming';
  onClose: () => void;
}

export function CallModal({ callId, peerId, peerName, type, direction, onClose }: CallModalProps) {
  const [status, setStatus] = useState<'ringing' | 'connecting' | 'active' | 'ended'>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(type === 'audio');
  const [duration, setDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const cleanedUp = useRef(false);
  const pendingSignals = useRef<any[]>([]);
  const mediaReady = useRef(false);

  const cleanup = useCallback(() => {
    if (cleanedUp.current) return;
    cleanedUp.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
  }, []);

  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const createPC = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        wsClient.send({
          type: 'call:signal',
          data: { callId, signal: { type: 'candidate', candidate: e.candidate } },
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus('active');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        handleEnd();
      }
    };

    return pc;
  };

  const processSignal = async (signal: any) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        wsClient.send({
          type: 'call:signal',
          data: { callId, signal: { type: 'answer', sdp: answer } },
        });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error('Ошибка обработки сигнала:', err);
    }
  };

  useEffect(() => {
    const unsubSignal = wsClient.on('call:signal', (data: any) => {
      if (data.callId !== callId) return;
      if (!mediaReady.current) {
        pendingSignals.current.push(data.signal);
      } else {
        processSignal(data.signal);
      }
    });

    const unsubAccepted = wsClient.on('call:accepted', async (data: any) => {
      if (data.callId !== callId) return;
      setStatus('connecting');
      const pc = createPC();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        mediaReady.current = true;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        wsClient.send({
          type: 'call:signal',
          data: { callId, signal: { type: 'offer', sdp: offer } },
        });
      } catch (err) {
        console.error('Ошибка доступа к медиа:', err);
        setStatus('ended');
      }
    });

    const unsubDeclined = wsClient.on('call:declined', (data: any) => {
      if (data.callId === callId) {
        setStatus('ended');
        setTimeout(() => { cleanup(); onClose(); }, 1500);
      }
    });

    const unsubEnded = wsClient.on('call:ended', (data: any) => {
      if (data.callId === callId) {
        setStatus('ended');
        setTimeout(() => { cleanup(); onClose(); }, 1000);
      }
    });

    return () => {
      unsubSignal();
      unsubAccepted();
      unsubDeclined();
      unsubEnded();
      cleanup();
    };
  }, [callId, type, direction, cleanup, onClose]);

  const handleAccept = async () => {
    setStatus('connecting');
    const pc = createPC();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      mediaReady.current = true;

      for (const signal of pendingSignals.current) {
        await processSignal(signal);
      }
      pendingSignals.current = [];

      wsClient.send({ type: 'call:accept', data: { callId } });
    } catch (err) {
      console.error('Ошибка доступа к медиа:', err);
      setStatus('ended');
    }
  };

  const handleDecline = () => {
    wsClient.send({ type: 'call:decline', data: { callId } });
    setStatus('ended');
    cleanup();
    onClose();
  };

  const handleEnd = () => {
    wsClient.send({ type: 'call:end', data: { callId } });
    setStatus('ended');
    setTimeout(() => { cleanup(); onClose(); }, 500);
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOff(!videoTrack.enabled);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const statusText = {
    ringing: direction === 'outgoing' ? 'Вызов...' : 'Входящий звонок',
    connecting: 'Подключение...',
    active: formatDuration(duration),
    ended: 'Звонок завершён',
  }[status];

  const isVideoCall = type === 'video';

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-[600px] m-4 flex flex-col items-center justify-center">

        {/* Удалённое видео */}
        {isVideoCall && status === 'active' && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover rounded-2xl"
          />
        )}

        {/* Удалённое аудио */}
        {!isVideoCall && (
          <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
        )}

        {/* Аватар / статус */}
        {(!isVideoCall || status !== 'active') && (
          <div className="flex flex-col items-center gap-4 z-10">
            <div className="w-24 h-24 rounded-full bg-acid-green/20 flex items-center justify-center text-acid-green text-4xl font-bold neon-border-green">
              {peerName[0]?.toUpperCase() || '?'}
            </div>
            <div className="text-white text-xl font-medium neon-text-cyan">{peerName}</div>
            <div className={`text-sm ${status === 'ended' ? 'text-acid-pink' : 'text-gray-300'}`}>
              {statusText}
            </div>
            {status === 'ringing' && direction === 'outgoing' && (
              <div className="flex gap-2 mt-1">
                <span className="w-2 h-2 bg-acid-green rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-acid-cyan rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 bg-acid-pink rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            )}
          </div>
        )}

        {/* Локальное видео */}
        {isVideoCall && !isCamOff && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-20 right-4 w-36 h-28 object-cover rounded-xl border-2 border-acid-green/30 z-20"
          />
        )}

        {/* Таймер поверх видео */}
        {isVideoCall && status === 'active' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 glass px-4 py-1 rounded-full text-white text-sm z-20 neon-text-green">
            {statusText}
          </div>
        )}

        {/* Кнопки управления */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
          {status === 'ringing' && direction === 'incoming' && (
            <>
              <button
                onClick={handleDecline}
                className="w-14 h-14 rounded-full bg-acid-pink flex items-center justify-center text-white hover:shadow-neon-pink transition-all shadow-lg"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button
                onClick={handleAccept}
                className="w-14 h-14 rounded-full bg-acid-green flex items-center justify-center text-black hover:shadow-neon-green transition-all shadow-lg"
              >
                <Phone className="w-6 h-6" />
              </button>
            </>
          )}

          {(status === 'active' || status === 'connecting' || (status === 'ringing' && direction === 'outgoing')) && (
            <>
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isMuted ? 'bg-acid-pink text-white shadow-neon-pink' : 'glass text-white hover:bg-white/20'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {isVideoCall && (
                <button
                  onClick={toggleCamera}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    isCamOff ? 'bg-acid-pink text-white shadow-neon-pink' : 'glass text-white hover:bg-white/20'
                  }`}
                >
                  {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}

              <button
                onClick={handleEnd}
                className="w-14 h-14 rounded-full bg-acid-pink flex items-center justify-center text-white hover:shadow-neon-pink transition-all shadow-lg"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}

          {status === 'ended' && (
            <button
              onClick={() => { cleanup(); onClose(); }}
              className="w-12 h-12 rounded-full glass flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
