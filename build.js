#!/usr/bin/env node
/**
 * TeleAI Build Script
 * Собирает клиент и сервер для production
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const isProduction = process.env.NODE_ENV === 'production';

console.log('🔨 TeleAI Build\n');

// 1. Собираем клиент
console.log('📦 Сборка клиента...');
execSync('npx vite build', { cwd: path.join(ROOT, 'packages/client'), stdio: 'inherit' });
console.log('✅ Клиент собран\n');

// 2. Генерируем Prisma
console.log('🗄️  Генерация Prisma...');
execSync('npx prisma generate', { cwd: path.join(ROOT, 'packages/server'), stdio: 'inherit' });
console.log('✅ Prisma готов\n');

// 3. Пушим схему БД (создаём если нет)
console.log('🗄️  Применение схемы БД...');
// В production (Render) данные на диске /opt/render/project/data
// Локально - в packages/server/data
const dataDir = isProduction 
  ? '/opt/render/project/data'
  : path.join(ROOT, 'packages/server/data');
  
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
execSync('npx prisma db push --skip-generate', { cwd: path.join(ROOT, 'packages/server'), stdio: 'inherit' });
console.log('✅ БД готова\n');

// 4. Сидируем если БД пустая (только в production или при первом запуске)
if (!isProduction) {
  console.log('🌱 Сидирование БД...');
  try {
    execSync('npx tsx prisma/seed.ts', { cwd: path.join(ROOT, 'packages/server'), stdio: 'inherit' });
    console.log('✅ Сид выполнен\n');
  } catch {
    console.log('⚠️  Сид пропущен (возможно данные уже есть)\n');
  }
}

// 5. Создаём uploads папку
const uploadsDir = isProduction 
  ? '/tmp/uploads'
  : path.join(ROOT, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

console.log('🎉 Сборка завершена!');
console.log('   Запуск: npm start  или  TeleAI.bat\n');
