import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'save-sequence-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
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
                  try { fs.writeFileSync(filePath, data.content); } catch(e) { console.error('Save error:', e); }
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
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        editor: path.resolve(__dirname, 'editor.html')
      }
    }
  }
});
