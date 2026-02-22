import { FastifyInstance } from 'fastify';
import { v4 as uuid } from 'uuid';
import { prisma } from '../index.js';
import { sendToChat } from '../ws/handler.js';

export async function chatRoutes(app: FastifyInstance) {
  // Получить список чатов
  app.get('/', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const memberships = await prisma.chatMember.findMany({
      where: { userId: request.user.id },
      include: {
        chat: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isOnline: true,
                    lastSeen: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: { id: true, displayName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { chat: { updatedAt: 'desc' } },
    });

    const chats = memberships.map((m) => ({
      id: m.chat.id,
      type: m.chat.type,
      title: m.chat.type === 'private'
        ? m.chat.members.find((mem) => mem.userId !== request.user.id)?.user.displayName || 'Чат'
        : m.chat.title,
      avatarUrl: m.chat.type === 'private'
        ? m.chat.members.find((mem) => mem.userId !== request.user.id)?.user.avatarUrl
        : m.chat.avatarUrl,
      lastMessage: m.chat.messages[0] || null,
      unreadCount: m.unreadCount,
      isPinned: m.isPinned,
      isMuted: m.isMuted,
      isArchived: m.isArchived,
      memberCount: m.chat.members.length,
      participants: m.chat.members.map((mem) => mem.user),
      createdAt: m.chat.createdAt,
      updatedAt: m.chat.updatedAt,
    }));

    return reply.send({ success: true, data: chats });
  });

  // Создать личный чат
  app.post('/private', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { userId } = request.body as { userId: string };

    if (userId === request.user.id) {
      return reply.status(400).send({ success: false, error: 'Нельзя создать чат с самим собой' });
    }

    // Проверить, существует ли уже личный чат
    const existing = await prisma.chat.findFirst({
      where: {
        type: 'private',
        AND: [
          { members: { some: { userId: request.user.id } } },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    if (existing) {
      return reply.send({ success: true, data: { id: existing.id, ...existing } });
    }

    const chat = await prisma.chat.create({
      data: {
        type: 'private',
        members: {
          create: [
            { userId: request.user.id, role: 'member' },
            { userId, role: 'member' },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    return reply.status(201).send({ success: true, data: chat });
  });

  // Создать группу
  app.post('/group', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { title, participantIds } = request.body as {
      title: string;
      participantIds: string[];
    };

    if (!title) {
      return reply.status(400).send({ success: false, error: 'Укажите название группы' });
    }

    const inviteLink = uuid().slice(0, 12);

    const chat = await prisma.chat.create({
      data: {
        type: 'group',
        title,
        inviteLink,
        members: {
          create: [
            {
              userId: request.user.id,
              role: 'owner',
              canPinMessages: true,
              canDeleteMessages: true,
              canBanUsers: true,
              canEditInfo: true,
            },
            ...(participantIds || []).map((id: string) => ({
              userId: id,
              role: 'member' as const,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return reply.status(201).send({ success: true, data: chat });
  });

  // Создать канал
  app.post('/channel', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { title, description } = request.body as {
      title: string;
      description?: string;
    };

    if (!title) {
      return reply.status(400).send({ success: false, error: 'Укажите название канала' });
    }

    const inviteLink = uuid().slice(0, 12);

    const chat = await prisma.chat.create({
      data: {
        type: 'channel',
        title,
        description,
        inviteLink,
        members: {
          create: {
            userId: request.user.id,
            role: 'owner',
            canPinMessages: true,
            canDeleteMessages: true,
            canBanUsers: true,
            canEditInfo: true,
          },
        },
      },
    });

    return reply.status(201).send({ success: true, data: chat });
  });

  // Получить сообщения чата
  app.get('/:chatId/messages', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { chatId } = request.params as { chatId: string };
    const { limit = 50, before } = request.query as { limit?: number; before?: string };

    // Проверить членство
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: request.user.id } },
    });

    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Нет доступа к чату' });
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        ...(before && { createdAt: { lt: new Date(before) } }),
        scheduledAt: null, // Не показывать запланированные
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            text: true,
            senderId: true,
            sender: {
              select: { displayName: true },
            },
          },
        },
        reactions: {
          select: { emoji: true, userId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    // Сбросить unread
    await prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId: request.user.id } },
      data: { unreadCount: 0 },
    });

    return reply.send({
      success: true,
      data: messages.reverse(),
    });
  });

  // Отправить сообщение через REST (альтернатива WS)
  app.post('/:chatId/messages', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { chatId } = request.params as { chatId: string };
    const { text, type = 'text', replyToId, mediaUrl, mediaType, mediaName, mediaSize } =
      request.body as {
        text?: string;
        type?: string;
        replyToId?: string;
        mediaUrl?: string;
        mediaType?: string;
        mediaName?: string;
        mediaSize?: number;
      };

    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: request.user.id } },
    });

    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Нет доступа к чату' });
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: request.user.id,
        type,
        text,
        replyToId,
        mediaUrl,
        mediaType,
        mediaName,
        mediaSize,
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
        reactions: true,
      },
    });

    // Обновить updatedAt чата
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Увеличить unreadCount для других участников
    await prisma.chatMember.updateMany({
      where: {
        chatId,
        userId: { not: request.user.id },
      },
      data: { unreadCount: { increment: 1 } },
    });

    return reply.status(201).send({ success: true, data: message });
  });

  // Редактировать сообщение
  app.patch('/:chatId/messages/:messageId', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { chatId, messageId } = request.params as { chatId: string; messageId: string };
    const { text } = request.body as { text: string };

    const message = await prisma.message.findFirst({
      where: { id: messageId, chatId, senderId: request.user.id },
    });

    if (!message) {
      return reply.status(404).send({ success: false, error: 'Сообщение не найдено' });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { text, isEdited: true },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // Удалить сообщение
  app.delete('/:chatId/messages/:messageId', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { chatId, messageId } = request.params as { chatId: string; messageId: string };
    const { forEveryone } = request.query as { forEveryone?: string };

    const message = await prisma.message.findFirst({
      where: { id: messageId, chatId, senderId: request.user.id },
    });

    if (!message) {
      return reply.status(404).send({ success: false, error: 'Сообщение не найдено' });
    }

    await prisma.message.delete({ where: { id: messageId } });

    return reply.send({ success: true });
  });

  // Реакция на сообщение
  app.post('/:chatId/messages/:messageId/reactions', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { chatId, messageId } = request.params as { chatId: string; messageId: string };
    const { emoji } = request.body as { emoji: string };

    const existing = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: request.user.id,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
      return reply.send({ success: true, data: { action: 'removed' } });
    }

    await prisma.messageReaction.create({
      data: { messageId, userId: request.user.id, emoji },
    });

    return reply.send({ success: true, data: { action: 'added' } });
  });

  // Закрепить/открепить сообщение
  app.post('/:chatId/messages/:messageId/pin', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { chatId, messageId } = request.params as { chatId: string; messageId: string };

    const existing = await prisma.pinnedMessage.findUnique({
      where: { messageId },
    });

    if (existing) {
      await prisma.pinnedMessage.delete({ where: { id: existing.id } });
      sendToChat(chatId, { type: 'message:unpinned', data: { chatId, messageId } } as any);
      return reply.send({ success: true, data: { action: 'unpinned' } });
    }

    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: { select: { displayName: true } } },
    });

    await prisma.pinnedMessage.create({
      data: { chatId, messageId },
    });

    sendToChat(chatId, {
      type: 'message:pinned',
      data: { chatId, messageId, text: msg?.text, senderName: msg?.sender?.displayName },
    } as any);

    return reply.send({ success: true, data: { action: 'pinned', message: msg } });
  });

  // Получить закреплённое сообщение чата
  app.get('/:chatId/pinned', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { chatId } = request.params as { chatId: string };

    const pinned = await prisma.pinnedMessage.findFirst({
      where: { chatId },
      orderBy: { pinnedAt: 'desc' },
      include: {
        message: {
          include: {
            sender: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    return reply.send({ success: true, data: pinned });
  });

  // Поиск сообщений в чате
  app.get('/:chatId/messages/search', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { chatId } = request.params as { chatId: string };
    const { q } = request.query as { q: string };

    if (!q || q.trim().length === 0) {
      return reply.send({ success: true, data: [] });
    }

    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: request.user.id } },
    });
    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Нет доступа' });
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        text: { contains: q },
      },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return reply.send({ success: true, data: messages });
  });

  // Участники чата
  app.get('/:chatId/members', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { chatId } = request.params as { chatId: string };

    const members = await prisma.chatMember.findMany({
      where: { chatId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
    });

    return reply.send({ success: true, data: members });
  });

  // Присоединиться по ссылке
  app.post('/join/:inviteLink', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { inviteLink } = request.params as { inviteLink: string };

    const chat = await prisma.chat.findUnique({
      where: { inviteLink },
    });

    if (!chat) {
      return reply.status(404).send({ success: false, error: 'Чат не найден' });
    }

    const existing = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: chat.id, userId: request.user.id } },
    });

    if (existing) {
      return reply.send({ success: true, data: chat });
    }

    await prisma.chatMember.create({
      data: { chatId: chat.id, userId: request.user.id },
    });

    return reply.send({ success: true, data: chat });
  });

  // Покинуть чат
  app.delete('/:chatId/leave', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { chatId } = request.params as { chatId: string };

    await prisma.chatMember.deleteMany({
      where: { chatId, userId: request.user.id },
    });

    return reply.send({ success: true });
  });
}
