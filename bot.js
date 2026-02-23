/**
 * Node.js бот для периодического посещения сайта
 * Запускается: node bot.js
 */

const https = require('https');
const http = require('http');

// URL сайта для посещения
const TARGET_URL = 'https://telegram1.p7z.ru';

// Интервал в миллисекундах (1 минута = 60000 мс)
const INTERVAL_MS = 60000;

// Парсим URL
const urlObj = new URL(TARGET_URL);
const protocol = urlObj.protocol === 'https:' ? https : http;

// Функция для выполнения запроса
function visitSite() {
    const startTime = Date.now();
    
    const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive'
        }
    };

    const req = protocol.request(options, (res) => {
        const duration = Date.now() - startTime;
        const timestamp = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Qyzylorda' });
        
        console.log(`[${timestamp}] Статус: ${res.statusCode} | Время: ${duration}мс | URL: ${TARGET_URL}`);
        
        // Получаем размер ответа
        let dataSize = 0;
        res.on('data', (chunk) => {
            dataSize += chunk.length;
        });
        
        res.on('end', () => {
            console.log(`[${timestamp}] Получено данных: ${(dataSize / 1024).toFixed(2)} КБ`);
        });
    });

    req.on('error', (error) => {
        const timestamp = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Qyzylorda' });
        console.error(`[${timestamp}] Ошибка: ${error.message}`);
    });

    req.setTimeout(30000, () => {
        const timestamp = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Qyzylorda' });
        console.error(`[${timestamp}] Таймаут запроса`);
        req.destroy();
    });

    req.end();
}

// Запуск бота
console.log('========================================');
console.log('  Бот запущен!');
console.log(`  Целевой URL: ${TARGET_URL}`);
console.log(`  Интервал: ${INTERVAL_MS / 1000} секунд`);
console.log('========================================');
console.log('');

// Первый запрос сразу при запуске
visitSite();

// Повторяющиеся запросы каждую минуту
const intervalId = setInterval(visitSite, INTERVAL_MS);

// Обработка завершения работы
process.on('SIGINT', () => {
    console.log('\nОстановка бота...');
    clearInterval(intervalId);
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nОстановка бота...');
    clearInterval(intervalId);
    process.exit(0);
});
