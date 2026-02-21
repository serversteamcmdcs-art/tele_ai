# TeleAI — Мессенджер в русском патриотическом стиле

## Деплой на Render.com

### Шаг 1: Подготовка репозитория

1. Создайте репозиторий на GitHub и загрузите код:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ВАШ_ЮЗЕР/teleai.git
git push -u origin main
```

### Шаг 2: Создание сервиса на Render

1. Зайдите на [render.com](https://render.com) и войдите через GitHub
2. Нажмите **New +** → **Blueprint**
3. Выберите ваш репозиторий `teleai`
4. Render автоматически обнаружит `render.yaml` и создаст сервис

### Шаг 3: Настройка переменных окружения

Render автоматически установит:
- `NODE_ENV=production`
- `JWT_SECRET` (сгенерируется автоматически)
- `DATABASE_URL` (путь к SQLite на диске)

### Шаг 4: Деплой

Нажмите **Apply** и дождитесь завершения деплоя (обычно 3-5 минут).

После успешного деплоя ваше приложение будет доступно по адресу:
```
https://teleai-XXXX.onrender.com
```

## Локальная разработка

### Установка зависимостей
```bash
npm install
```

### Запуск в режиме разработки
```bash
npm run dev
```
Сервер: http://localhost:3001
Клиент: http://localhost:5173

### Сборка для production
```bash
npm run build
npm start
```

## Структура проекта

```
teleai/
├── packages/
│   ├── client/          # React + Vite фронтенд
│   ├── server/          # Fastify + Prisma бэкенд
│   ├── shared/          # Общие типы и константы
│   └── desktop/         # Electron десктоп-приложение
├── uploads/             # Загруженные файлы
├── render.yaml          # Конфигурация Render
└── package.json         # Root package.json
```

## Технологии

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Zustand
- **Backend**: Fastify, Prisma, SQLite
- **Real-time**: WebSocket
- **Auth**: JWT

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `NODE_ENV` | Режим работы | `development` |
| `PORT` | Порт сервера | `3001` |
| `JWT_SECRET` | Секрет для JWT | (обязательно в production) |
| `DATABASE_URL` | Путь к БД SQLite | `file:./packages/server/data/teleai.db` |
