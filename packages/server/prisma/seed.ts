import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Заполнение базы данных...');

  // Создать тестовых пользователей
  const password = await bcrypt.hash('123456', 12);

  const user1 = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password,
      displayName: 'Администратор',
      bio: 'Создатель TeleAI',
      settings: { create: {} },
    },
  });

  const user2 = await prisma.user.upsert({
    where: { username: 'ivan' },
    update: {},
    create: {
      username: 'ivan',
      password,
      displayName: 'Иван Петров',
      bio: 'Тестовый пользователь',
      settings: { create: {} },
    },
  });

  const user3 = await prisma.user.upsert({
    where: { username: 'maria' },
    update: {},
    create: {
      username: 'maria',
      password,
      displayName: 'Мария Иванова',
      bio: 'Тестовый пользователь',
      settings: { create: {} },
    },
  });

  // Избранное для каждого
  for (const user of [user1, user2, user3]) {
    const existing = await prisma.chat.findFirst({
      where: { type: 'saved', members: { some: { userId: user.id } } },
    });
    if (!existing) {
      await prisma.chat.create({
        data: {
          type: 'saved',
          title: 'Избранное',
          members: { create: { userId: user.id, role: 'owner' } },
        },
      });
    }
  }

  // Личный чат между user1 и user2
  const privateChat = await prisma.chat.create({
    data: {
      type: 'private',
      members: {
        create: [
          { userId: user1.id, role: 'member' },
          { userId: user2.id, role: 'member' },
        ],
      },
    },
  });

  // Тестовые сообщения
  await prisma.message.createMany({
    data: [
      { chatId: privateChat.id, senderId: user1.id, type: 'text', text: 'Привет! Добро пожаловать в TeleAI!' },
      { chatId: privateChat.id, senderId: user2.id, type: 'text', text: 'Привет! Классный мессенджер!' },
      { chatId: privateChat.id, senderId: user1.id, type: 'text', text: 'Спасибо! Мы только начали 🚀' },
    ],
  });

  // Тестовая группа
  await prisma.chat.create({
    data: {
      type: 'group',
      title: 'TeleAI — Общая',
      description: 'Общий чат для обсуждений',
      inviteLink: 'teleai-main',
      members: {
        create: [
          { userId: user1.id, role: 'owner', canPinMessages: true, canDeleteMessages: true, canBanUsers: true, canEditInfo: true },
          { userId: user2.id, role: 'admin', canPinMessages: true, canDeleteMessages: true },
          { userId: user3.id, role: 'member' },
        ],
      },
    },
  });

  // Тестовый канал
  await prisma.chat.create({
    data: {
      type: 'channel',
      title: 'TeleAI Новости',
      description: 'Официальный канал новостей TeleAI',
      inviteLink: 'teleai-news',
      members: {
        create: [
          { userId: user1.id, role: 'owner', canPinMessages: true, canDeleteMessages: true, canEditInfo: true },
        ],
      },
    },
  });

  console.log('✅ База данных заполнена!');
  console.log('\nТестовые аккаунты (пароль: 123456):');
  console.log('  admin — Администратор');
  console.log('  ivan — Иван Петров');
  console.log('  maria — Мария Иванова');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
