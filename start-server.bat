@echo off
chcp 65001 >nul
title TeleAI Server
color 0A

echo.
echo  ═══════════════════════════════════════
echo   TeleAI Server
echo  ═══════════════════════════════════════
echo.

cd /d "%~dp0"

:: Проверяем наличие Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [ОШИБКА] Node.js не найден!
    echo  Скачайте: https://nodejs.org
    pause
    exit /b 1
)

:: Проверяем, запущен ли уже сервер
curl -s -o nul -w "%%{http_code}" http://localhost:3001/api/health > "%TEMP%\teleai_health.txt" 2>nul
set /p HEALTH=<"%TEMP%\teleai_health.txt"
del "%TEMP%\teleai_health.txt" 2>nul

if "%HEALTH%"=="200" (
    echo  [OK] Сервер уже запущен на http://localhost:3001
    echo.
    timeout /t 3 >nul
    exit /b 0
)

:: Проверяем собран ли клиент
if not exist "packages\client\dist\index.html" (
    echo  [!] Первый запуск — выполняю сборку...
    echo.
    call npm install
    node build.js
    echo.
)

:: Проверяем БД
if not exist "packages\server\data\teleai.db" (
    echo  [!] Создаю базу данных...
    cd packages\server
    call npx prisma db push --skip-generate
    call npx tsx prisma/seed.ts
    cd ..\..
    echo.
)

echo  [*] Запускаю TeleAI сервер...
echo  [*] Для остановки закройте это окно или нажмите Ctrl+C
echo.

:: Запускаем сервер
npx tsx packages/server/src/index.ts

pause
