import { FastifyInstance } from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { v4 as uuid } from 'uuid';
import { MAX_FILE_SIZE } from '@teleai/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../../../../uploads');

export async function mediaRoutes(app: FastifyInstance) {
  // Создать папку uploads если нет
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  // Загрузка файла
  app.post('/upload', {
    preHandler: [app.authenticate as any],
  }, async (request: any, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ success: false, error: 'Файл не найден' });
    }

    const ext = path.extname(data.filename) || '';
    const fileId = uuid();
    const fileName = `${fileId}${ext}`;

    // Определить подпапку по типу
    let subDir = 'files';
    const mime = data.mimetype || '';
    if (mime.startsWith('image/')) subDir = 'images';
    else if (mime.startsWith('video/')) subDir = 'videos';
    else if (mime.startsWith('audio/')) subDir = 'audio';

    const dirPath = path.join(UPLOADS_DIR, subDir);
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, fileName);

    // Записать файл
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length > MAX_FILE_SIZE) {
      return reply.status(413).send({ success: false, error: 'Файл слишком большой' });
    }

    await fs.writeFile(filePath, buffer);

    const url = `/uploads/${subDir}/${fileName}`;

    return reply.send({
      success: true,
      data: {
        id: fileId,
        url,
        fileName: data.filename,
        fileSize: buffer.length,
        mimeType: data.mimetype,
        type: subDir === 'images' ? 'image'
            : subDir === 'videos' ? 'video'
            : subDir === 'audio' ? 'audio'
            : 'file',
      },
    });
  });
}
