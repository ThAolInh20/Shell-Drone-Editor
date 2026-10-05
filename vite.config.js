import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'save-sequence-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/previews/')) {
            const rawPath = req.url.split('?')[0];
            const filePath = path.resolve(__dirname, 'public', rawPath.replace(/^\//, ''));
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const stat = fs.statSync(filePath);
              const fileSize = stat.size;
              const range = req.headers.range;

              const ext = path.extname(filePath).toLowerCase();
              const contentType = ext === '.mp4' ? 'video/mp4' :
                ext === '.webm' ? 'video/webm' :
                ext === '.gif' ? 'image/gif' :
                'application/octet-stream';

              if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(filePath, { start, end });
                res.writeHead(206, {
                  'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                  'Accept-Ranges': 'bytes',
                  'Content-Length': chunksize,
                  'Content-Type': contentType,
                });
                file.pipe(res);
                return;
              } else {
                res.writeHead(200, {
                  'Content-Length': fileSize,
                  'Accept-Ranges': 'bytes',
                  'Content-Type': contentType,
                });
                fs.createReadStream(filePath).pipe(res);
                return;
              }
            }
          }

          if (req.url === '/api/list-sequences' && req.method === 'GET') {
            const dirPath = path.resolve(__dirname, 'src/config/sequences');
            try {
              const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, files }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          } else if (req.url === '/api/save-sequence' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                // Đề phòng trường hợp Vite đã parse sẵn
                const data = req.body || JSON.parse(body || '{}');
                if (!data.filename || !data.content) {
                  throw new Error("Missing filename or content");
                }
                const safeFilename = data.filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
                if (!safeFilename.endsWith('.json')) {
                  throw new Error("Filename must end with .json");
                }
                const filePath = path.resolve(__dirname, 'src/config/sequences', safeFilename);

                // Trả về response trước khi ghi file để tránh việc Vite HMR ngắt kết nối
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true }));

                setTimeout(() => {
                  try { fs.writeFileSync(filePath, data.content); } catch (e) { console.error('Save error:', e); }
                }, 50);

              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    watch: {
      ignored: [
        '**/src/config/sequences/**',
        '**/dist-electron/**',
        '**/dist/**',
        '**/public/previews/**',
        '**/*.mp4',
        '**/*.webm',
        '**/*.gif'
      ]
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        editor: path.resolve(__dirname, 'editor.html'),
        formation: path.resolve(__dirname, 'formation.html')
      }
    }
  }
});
