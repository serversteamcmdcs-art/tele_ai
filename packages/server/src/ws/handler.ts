import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { prisma } from '../index.js';
import type { ClientEvent, ServerEvent } from '@teleai/shared';

// Хранилище подключений: userId -> Set<WebSocket>
const connections = new Map<string, Set<WebSocket>>();

export function getConnections() {
  return connections;
}

export function sendToUser(userId: string, event: ServerEvent) {
  const userSockets = connections.get(userId);
  if (!userSockets) return;

  const data = JSON.stringify(event);
  for (const ws of userSockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

export function sendToChat(chatId: string, event: ServerEvent, excludeUserId?: string) {
  // Получаем участников чата из кеша или БД
  prisma.chatMember
    .findMany({ where: { chatId }, select: { userId: true } })
    .then((members) => {
      for (const member of members) {
        if (member.userId !== excludeUserId) {
          sendToUser(member.userId, event);
        }
      }
    });
}

export function setupWebSocket(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, async (socket, request) => {
    // Аутентификация через query параметр
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4001, 'Token required');
      return;
    }

    let userId: string;
    try {
      const decoded = app.jwt.verify<{ id: string }>(token);
      userId = decoded.id;
    } catch {
      socket.close(4001, 'Invalid token');
      return;
    }

    // Регистрируем подключение
    if (!connections.has(userId)) {
      connections.set(userId, new Set());
    }
    connections.get(userId)!.add(socket);

    // Обновляем статус онлайн
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true },
    });

    // Уведомляем контакты о статусе
    broadcastUserStatus(userId, true);

    // Обработка сообщений
    socket.on('message', async (raw) => {
      try {
        const event = JSON.parse(raw.toString()) as ClientEvent;
        await handleClientEvent(userId, event, socket, app);
      } catch (err) {
        socket.send(JSON.stringify({
          type: 'error',
          data: { code: 'PARSE_ERROR', message: 'Ошибка обработки сообщения' },
        }));
      }
    });

    // Отключение
    socket.on('close', async () => {
      const userSockets = connections.get(userId);
      if (userSockets) {
        userSockets.delete(socket);
        if (userSockets.size === 0) {
          connections.delete(userId);
          await prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen: new Date() },
          });
          broadcastUserStatus(userId, false);
        }
      }
    });

    // Пинг-понг для поддержания соединения
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping();
      }
    }, 30000);

    socket.on('close', () => clearInterval(pingInterval));
  });
}

async function handleClientEvent(
  userId: string,
  event: ClientEvent,
  socket: WebSocket,
  app: FastifyInstance,
) {
  switch (event.type) {
    case 'ping':
      socket.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'message:send':
      await handleSendMessage(userId, event.data);
      break;

    case 'message:edit':
      await handleEditMessage(userId, event.data);
      break;

    case 'message:delete':
      await handleDeleteMessage(userId, event.data);
      break;

    case 'message:read':
      await handleReadMessage(userId, event.data);
      break;

    case 'message:reaction':
      await handleReaction(userId, event.data);
      break;

    case 'typing:start':
      sendToChat(event.data.chatId, {
        type: 'typing:update',
        data: { chatId: event.data.chatId, userId, isTyping: true },
      }, userId);
      break;

    case 'typing:stop':
      sendToChat(event.data.chatId, {
        type: 'typing:update',
        data: { chatId: event.data.chatId, userId, isTyping: false },
      }, userId);
      break;

    case 'call:initiate':
      await handleCallInitiate(userId, event.data);
      break;

    case 'call:accept':
    case 'call:decline':
    case 'call:end':
      await handleCallAction(userId, event.type, event.data);
      break;

    case 'call:signal':
      await handleCallSignal(userId, event.data);
      break;
  }
}

async function handleSendMessage(userId: string, data: any) {
  // Если пересылка — получаем имя оригинального отправителя
  let forwardFromSender: string | undefined;
  if (data.forwardFromMessageId) {
    const orig = await prisma.message.findUnique({
      where: { id: data.forwardFromMessageId },
      include: { sender: { select: { displayName: true } } },
    });
    forwardFromSender = orig?.sender?.displayName || undefined;
  }

  const message = await prisma.message.create({
    data: {
      chatId: data.chatId,
      senderId: userId,
      type: data.type || 'text',
      text: data.text,
      replyToId: data.replyToId,
      mediaUrl: data.mediaUrl || undefined,
      forwardFromChatId: data.forwardFromChatId,
      forwardFromMessageId: data.forwardFromMessageId,
      forwardFromSender,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    },
    include: {
      sender: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      replyTo: {
        select: {
          id: true,
          text: true,
          sender: { select: { displayName: true } },
        },
      },
    },
  });

  await prisma.chat.update({
    where: { id: data.chatId },
    data: { updatedAt: new Date() },
  });

  await prisma.chatMember.updateMany({
    where: { chatId: data.chatId, userId: { not: userId } },
    data: { unreadCount: { increment: 1 } },
  });

  const msgData = {
    id: message.id,
    chatId: message.chatId,
    senderId: message.senderId,
    type: message.type,
    text: message.text || undefined,
    mediaUrl: message.mediaUrl || undefined,
    replyToId: message.replyToId || undefined,
    forwardFromSender: message.forwardFromSender || undefined,
    createdAt: message.createdAt.toISOString(),
  };

  // Отправляем всем КРОМЕ отправителя
  sendToChat(data.chatId, {
    type: 'message:new',
    data: msgData,
  }, userId);

  // Отправителю — подтверждение с _self флагом
  sendToUser(userId, {
    type: 'message:new',
    data: { ...msgData, _self: true },
  });
}

async function handleEditMessage(userId: string, data: any) {
  const message = await prisma.message.findFirst({
    where: { id: data.messageId, senderId: userId },
  });

  if (!message) return;

  await prisma.message.update({
    where: { id: data.messageId },
    data: { text: data.text, isEdited: true },
  });

  sendToChat(data.chatId, {
    type: 'message:edited',
    data: {
      id: data.messageId,
      chatId: data.chatId,
      senderId: userId,
      type: message.type,
      text: data.text,
      createdAt: message.createdAt.toISOString(),
    },
  });
}

async function handleDeleteMessage(userId: string, data: any) {
  const message = await prisma.message.findFirst({
    where: { id: data.messageId, senderId: userId },
  });

  if (!message) return;

  await prisma.message.delete({ where: { id: data.messageId } });

  if (data.forEveryone) {
    sendToChat(data.chatId, {
      type: 'message:deleted',
      data: { messageId: data.messageId, chatId: data.chatId },
    });
  }
}

async function handleReadMessage(userId: string, data: any) {
  await prisma.chatMember.update({
    where: { chatId_userId: { chatId: data.chatId, userId } },
    data: { unreadCount: 0, lastReadMessageId: data.messageId },
  });

  sendToChat(data.chatId, {
    type: 'message:status',
    data: { messageId: data.messageId, chatId: data.chatId, status: 'read' },
  }, userId);
}

async function handleReaction(userId: string, data: any) {
  const existing = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId: data.messageId,
        userId,
        emoji: data.emoji,
      },
    },
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
    sendToChat(data.chatId, {
      type: 'message:reaction',
      data: { messageId: data.messageId, chatId: data.chatId, userId, emoji: data.emoji, action: 'remove' },
    });
  } else {
    await prisma.messageReaction.create({
      data: { messageId: data.messageId, userId, emoji: data.emoji },
    });
    sendToChat(data.chatId, {
      type: 'message:reaction',
      data: { messageId: data.messageId, chatId: data.chatId, userId, emoji: data.emoji, action: 'add' },
    });
  }
}

async function handleCallInitiate(userId: string, data: any) {
  const call = await prisma.call.create({
    data: {
      type: data.type,
      callerId: userId,
      receiverId: data.userId,
    },
  });

  // Уведомляем получателя
  sendToUser(data.userId, {
    type: 'call:incoming',
    data: { callId: call.id, callerId: userId, type: data.type },
  });

  // Отправляем callId обратно инициатору
  sendToUser(userId, {
    type: 'call:created',
    data: { callId: call.id, receiverId: data.userId, type: data.type },
  });
}

async function handleCallAction(userId: string, type: string, data: any) {
  const call = await prisma.call.findUnique({ where: { id: data.callId } });
  if (!call) return;

  const targetUserId = call.callerId === userId ? call.receiverId : call.callerId;

  if (type === 'call:accept') {
    await prisma.call.update({
      where: { id: data.callId },
      data: { status: 'active', startedAt: new Date() },
    });
    sendToUser(targetUserId, { type: 'call:accepted', data: { callId: data.callId } });
  } else if (type === 'call:decline') {
    await prisma.call.update({
      where: { id: data.callId },
      data: { status: 'declined' },
    });
    sendToUser(targetUserId, { type: 'call:declined', data: { callId: data.callId } });
  } else if (type === 'call:end') {
    const now = new Date();
    const duration = call.startedAt ? Math.round((now.getTime() - call.startedAt.getTime()) / 1000) : 0;
    await prisma.call.update({
      where: { id: data.callId },
      data: { status: 'ended', endedAt: now, duration },
    });
    sendToUser(targetUserId, { type: 'call:ended', data: { callId: data.callId } });
  }
}

async function handleCallSignal(userId: string, data: any) {
  const call = await prisma.call.findUnique({ where: { id: data.callId } });
  if (!call) return;

  const targetUserId = call.callerId === userId ? call.receiverId : call.callerId;
  sendToUser(targetUserId, {
    type: 'call:signal',
    data: { callId: data.callId, signal: data.signal },
  });
}

async function broadcastUserStatus(userId: string, isOnline: boolean) {
  const contacts = await prisma.contact.findMany({
    where: { contactId: userId },
    select: { userId: true },
  });

  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    select: { chatId: true },
  });

  const notifiedUsers = new Set<string>();

  for (const contact of contacts) {
    if (!notifiedUsers.has(contact.userId)) {
      notifiedUsers.add(contact.userId);
      sendToUser(contact.userId, isOnline
        ? { type: 'user:online', data: { userId } }
        : { type: 'user:offline', data: { userId, lastSeen: new Date().toISOString() } }
      );
    }
  }
}
