const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');

const SERVER_URL = 'http://localhost:3001';
const HEALTH_URL = `${SERVER_URL}/api/health`;

let mainWindow = null;
let healthCheckInterval = null;

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 2000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'TeleAI',
    backgroundColor: '#050510',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Убираем стандартное меню
  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
  });

  // Загружаем приложение или заглушку
  loadApp();
}

async function loadApp() {
  const serverUp = await checkServer();

  if (serverUp) {
    mainWindow.loadURL(SERVER_URL);
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
  } else {
    // Показываем заглушку
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSplashHTML())}`);

    // Периодически проверяем сервер
    if (!healthCheckInterval) {
      healthCheckInterval = setInterval(async () => {
        const up = await checkServer();
        if (up && mainWindow) {
          clearInterval(healthCheckInterval);
          healthCheckInterval = null;
          mainWindow.loadURL(SERVER_URL);
        }
      }, 2000);
    }
  }
}

function getSplashHTML() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #050510;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(circle at 20% 50%, rgba(57,255,20,0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 50%, rgba(255,16,240,0.08) 0%, transparent 50%),
      radial-gradient(circle at 50% 80%, rgba(0,240,255,0.06) 0%, transparent 50%);
    animation: pulse 4s ease-in-out infinite alternate;
    z-index: 0;
  }
  @keyframes pulse {
    from { opacity: 0.5; }
    to { opacity: 1; }
  }
  .container {
    text-align: center;
    z-index: 1;
    position: relative;
  }
  .logo {
    font-size: 48px;
    font-weight: bold;
    margin-bottom: 20px;
  }
  .logo .a { color: #39FF14; text-shadow: 0 0 20px rgba(57,255,20,0.5); }
  .logo .i { color: #FF10F0; text-shadow: 0 0 20px rgba(255,16,240,0.5); }
  .status {
    font-size: 18px;
    color: #888;
    margin-bottom: 30px;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(57,255,20,0.2);
    border-top-color: #39FF14;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .hint {
    font-size: 14px;
    color: #555;
    max-width: 400px;
    line-height: 1.6;
  }
  .hint code {
    background: rgba(57,255,20,0.1);
    color: #39FF14;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 13px;
  }
  .bar {
    display: flex;
    gap: 0;
    width: 120px;
    height: 3px;
    margin: 30px auto 0;
    border-radius: 2px;
    overflow: hidden;
  }
  .bar div { flex: 1; }
  .bar .g { background: #39FF14; box-shadow: 0 0 8px #39FF14; }
  .bar .c { background: #00F0FF; box-shadow: 0 0 8px #00F0FF; }
  .bar .p { background: #FF10F0; box-shadow: 0 0 8px #FF10F0; }
</style>
</head>
<body>
  <div class="container">
    <div class="logo">Tele<span class="a">A</span><span class="i">I</span></div>
    <div class="spinner"></div>
    <div class="status">Ожидание сервера...</div>
    <div class="hint">
      Запустите сервер через <code>start-server.bat</code><br>
      или <code>TeleAI.bat</code> для автоматического запуска
    </div>
    <div class="bar"><div class="g"></div><div class="c"></div><div class="p"></div></div>
  </div>
</body>
</html>`;
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
