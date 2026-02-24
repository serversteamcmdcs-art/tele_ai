import { FastifyInstance } from 'fastify';
import { prisma } from '../index.js';

export async function userRoutes(app: FastifyInstance) {
  // Поиск пользователей
  app.get('/search', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { q } = request.query as { q: string };

    if (!q || q.length < 2) {
      return reply.send({ success: true, data: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: request.user.id } },
          {
            OR: [
              { username: { contains: q } },
              { displayName: { contains: q } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isOnline: true,
        lastSeen: true,
      },
      take: 20,
    });

    return reply.send({ success: true, data: users });
  });

  // Получить профиль пользователя
  app.get('/:id', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ success: false, error: 'Пользователь не найден' });
    }

    return reply.send({ success: true, data: user });
  });

  // Обновить профиль
  app.patch('/me', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { displayName, bio, avatarUrl } = request.body as {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
    };

    const user = await prisma.user.update({
      where: { id: request.user.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    return reply.send({ success: true, data: user });
  });

  // Обновить настройки
  app.patch('/me/settings', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const settings = request.body as Record<string, any>;

    const updated = await prisma.userSettings.upsert({
      where: { userId: request.user.id },
      update: settings,
      create: { userId: request.user.id, ...settings },
    });

    return reply.send({ success: true, data: updated });
  });

  // Контакты — список
  app.get('/me/contacts', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const contacts = await prisma.contact.findMany({
      where: { userId: request.user.id },
      include: {
        contact: {
          select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
    });

    return reply.send({
      success: true,
      data: contacts.map((c) => c.contact),
    });
  });

  // Контакты — добавить
  app.post('/me/contacts', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { userId } = request.body as { userId: string };

    if (userId === request.user.id) {
      return reply.status(400).send({ success: false, error: 'Нельзя добавить себя' });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return reply.status(404).send({ success: false, error: 'Пользователь не найден' });
    }

    await prisma.contact.upsert({
      where: {
        userId_contactId: { userId: request.user.id, contactId: userId },
      },
      update: {},
      create: { userId: request.user.id, contactId: userId },
    });

    return reply.send({ success: true });
  });

  // Контакты — удалить
  app.delete('/me/contacts/:userId', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { userId } = request.params as { userId: string };

    await prisma.contact.deleteMany({
      where: { userId: request.user.id, contactId: userId },
    });

    return reply.send({ success: true });
  });

  // Блокировка
  app.post('/me/block', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { userId } = request.body as { userId: string };

    await prisma.blockedUser.upsert({
      where: {
        blockerId_blockedId: { blockerId: request.user.id, blockedId: userId },
      },
      update: {},
      create: { blockerId: request.user.id, blockedId: userId },
    });

    return reply.send({ success: true });
  });

  // Разблокировка
  app.delete('/me/block/:userId', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { userId } = request.params as { userId: string };

    await prisma.blockedUser.deleteMany({
      where: { blockerId: request.user.id, blockedId: userId },
    });

    return reply.send({ success: true });
  });

  // Удалить аккаунт
  app.delete('/me', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    await prisma.user.delete({ where: { id: request.user.id } });
    return reply.send({ success: true });
  });
}
