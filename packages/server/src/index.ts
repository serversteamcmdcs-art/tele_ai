import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_PORT, MAX_FILE_SIZE } from '@teleai/shared';
import { authRoutes } from './auth/routes.js';
import { chatRoutes } from './chat/routes.js';
import { mediaRoutes } from './media/routes.js';
import { userRoutes } from './auth/userRoutes.js';
import { setupWebSocket } from './ws/handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const prisma = new PrismaClient();

const app = Fastify({
  logger: true,
});

async function start() {
  // Плагины
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'teleai-secret-key-change-in-production',
  });

  await app.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  });

  // Статика — загруженные файлы (корень проекта/uploads)
  const uploadsPath = path.resolve(__dirname, '..', '..', '..', 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  await app.register(fastifyStatic, {
    root: uploadsPath,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // WebSocket
  await app.register(fastifyWebsocket);

  // Декоратор для проверки JWT
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ success: false, error: 'Не авторизован' });
    }
  });

  // Маршруты API
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(chatRoutes, { prefix: '/api/chats' });
  await app.register(mediaRoutes, { prefix: '/api/media' });

  // WebSocket
  setupWebSocket(app);

  // Healthcheck
  app.get('/api/health', async () => {
    return { status: 'ok', app: 'TeleAI', version: '1.0.0' };
  });

  // В production раздаём собранный клиент
  const clientDistPath = path.resolve(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(clientDistPath)) {
    await app.register(fastifyStatic, {
      root: clientDistPath,
      prefix: '/',
      decorateReply: false,
    });
    // SPA fallback — все неизвестные роуты → index.html
    const indexHtmlPath = path.join(clientDistPath, 'index.html');
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/ws') || request.url.startsWith('/uploads/')) {
        reply.status(404).send({ success: false, error: 'Not found' });
      } else {
        const html = fs.readFileSync(indexHtmlPath, 'utf-8');
        reply.type('text/html').send(html);
      }
    });
  }

  // Запуск
  const port = Number(process.env.PORT) || DEFAULT_PORT;

  // Убиваем процесс на порту если занят
  const killPort = async (p: number) => {
    const { exec: execCb } = await import('child_process');
    return new Promise<void>((resolve) => {
      const isWin = process.platform === 'win32';
      if (isWin) {
        execCb(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${p} ^| findstr LISTENING') do taskkill /F /PID %a`, { shell: 'cmd.exe' }, () => resolve());
      } else {
        execCb(`lsof -ti:${p} | xargs kill -9 2>/dev/null`, () => resolve());
      }
    });
  };

  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Порт ${port} занят, освобождаю...`);
      await killPort(port);
      await new Promise((r) => setTimeout(r, 1000));
      try {
        await app.listen({ port, host: '0.0.0.0' });
      } catch (err2) {
        console.error('Не удалось запустить сервер:', err2);
        process.exit(1);
      }
    } else {
      app.log.error(err);
      process.exit(1);
    }
  }

  console.log(`\n🚀 TeleAI запущен на http://localhost:${port}\n`);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
