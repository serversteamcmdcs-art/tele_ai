import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH, MIN_PASSWORD_LENGTH } from '@teleai/shared';

export async function authRoutes(app: FastifyInstance) {
  // Регистрация
  app.post('/register', async (request, reply) => {
    const { username, password, displayName } = request.body as {
      username: string;
      password: string;
      displayName: string;
    };

    // Валидация
    if (!username || !password || !displayName) {
      return reply.status(400).send({
        success: false,
        error: 'Заполните все поля',
      });
    }

    if (username.length < MIN_USERNAME_LENGTH || username.length > MAX_USERNAME_LENGTH) {
      return reply.status(400).send({
        success: false,
        error: `Логин должен быть от ${MIN_USERNAME_LENGTH} до ${MAX_USERNAME_LENGTH} символов`,
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return reply.status(400).send({
        success: false,
        error: 'Логин может содержать только латинские буквы, цифры и _',
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return reply.status(400).send({
        success: false,
        error: `Пароль должен быть минимум ${MIN_PASSWORD_LENGTH} символов`,
      });
    }

    // Проверка уникальности
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return reply.status(409).send({
        success: false,
        error: 'Пользователь с таким логином уже существует',
      });
    }

    // Создание пользователя
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        displayName,
        settings: {
          create: {},
        },
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

    // Создать «Избранное»
    await prisma.chat.create({
      data: {
        type: 'saved',
        title: 'Избранное',
        members: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
    });

    // JWT токен
    const token = app.jwt.sign({ id: user.id, username: user.username });

    // Сессия
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        device: request.headers['user-agent'] || 'unknown',
        ip: request.ip,
      },
    });

    return reply.status(201).send({
      success: true,
      data: { token, user },
    });
  });

  // Вход
  app.post('/login', async (request, reply) => {
    const { username, password } = request.body as {
      username: string;
      password: string;
    };

    if (!username || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Введите логин и пароль',
      });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        password: true,
      },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Неверный логин или пароль',
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return reply.status(401).send({
        success: false,
        error: 'Неверный логин или пароль',
      });
    }

    const token = app.jwt.sign({ id: user.id, username: user.username });

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        device: request.headers['user-agent'] || 'unknown',
        ip: request.ip,
      },
    });

    // Обновить статус
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true },
    });

    const { password: _, ...userData } = user;

    return reply.send({
      success: true,
      data: { token, user: userData },
    });
  });

  // Выход
  app.post('/logout', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }

    await prisma.user.update({
      where: { id: request.user.id },
      data: { isOnline: false, lastSeen: new Date() },
    });

    return reply.send({ success: true });
  });

  // Текущий пользователь
  app.get('/me', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        settings: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ success: false, error: 'Пользователь не найден' });
    }

    return reply.send({ success: true, data: user });
  });

  // Активные сессии
  app.get('/sessions', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const sessions = await prisma.session.findMany({
      where: { userId: request.user.id },
      select: {
        id: true,
        device: true,
        ip: true,
        lastUsed: true,
        createdAt: true,
      },
      orderBy: { lastUsed: 'desc' },
    });

    return reply.send({ success: true, data: sessions });
  });

  // Завершить сессию
  app.delete('/sessions/:id', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const { id } = request.params as { id: string };

    await prisma.session.deleteMany({
      where: { id, userId: request.user.id },
    });

    return reply.send({ success: true });
  });
}
