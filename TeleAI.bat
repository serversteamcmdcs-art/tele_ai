@echo off
chcp 65001 >nul
title TeleAI
color 1F

echo.
echo  ████████╗███████╗██╗     ███████╗ █████╗ ██╗
echo  ╚══██╔══╝██╔════╝██║     ██╔════╝██╔══██╗██║
echo     ██║   █████╗  ██║     █████╗  ███████║██║
echo     ██║   ██╔══╝  ██║     ██╔══╝  ██╔══██║██║
echo     ██║   ███████╗███████╗███████╗██║  ██║██║
echo     ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝
echo.
echo  Российский патриотический мессенджер v1.0.0
echo  ═══════════════════════════════════════════
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
    echo  [OK] Сервер уже запущен
) else (
    echo  [*] Запускаю сервер в фоне...
    start "TeleAI Server" cmd /c ""%~dp0start-server.bat""

    echo  [*] Жду запуска сервера...
    :wait_server
    timeout /t 2 /nobreak >nul
    curl -s -o nul -w "%%{http_code}" http://localhost:3001/api/health > "%TEMP%\teleai_health2.txt" 2>nul
    set /p HEALTH2=<"%TEMP%\teleai_health2.txt"
    del "%TEMP%\teleai_health2.txt" 2>nul
    if not "%HEALTH2%"=="200" (
        echo  [*] Еще не готов, жду...
        goto wait_server
    )
    echo  [OK] Сервер запущен!
)

echo.
echo  [*] Запускаю TeleAI Desktop...
echo.

:: Запускаем Electron
cd packages\desktop
if exist "node_modules\.package-lock.json" (
    npx electron .
) else (
    echo  [!] Устанавливаю Electron...
    call npm install
    npx electron .
)

exit /b 0
