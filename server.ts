import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzu-zcoOlitQEF6Rsq7i9Yr-wNdKZqsKJGqWvUsXOQDehqWpsNk-3aYXqX1pC88xr-0lg/exec';
const GAS_URL = (process.env.VITE_API_URL || DEFAULT_GAS_URL).trim();

async function startServer() {
  const app = express();

  // Middleware body parsing
  app.use(express.json({ limit: '25mb' }));
  app.use(express.text({ type: ['text/*', 'application/javascript'], limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // =========================================================================
  // API PROXY: /api/gas
  // Meneruskan request ke Google Apps Script tanpa CORS & iframe redirect blocker
  // =========================================================================
  app.all('/api/gas', async (req, res) => {
    try {
      const targetUrl = GAS_URL;
      const method = req.method;

      if (method === 'GET') {
        const queryStr = req.url.includes('?') ? req.url.split('?')[1] : '';
        const fullUrl = queryStr ? `${targetUrl}?${queryStr}` : targetUrl;
        
        const gasRes = await fetch(fullUrl, {
          method: 'GET',
          redirect: 'follow',
        });
        
        const dataText = await gasRes.text();
        res.setHeader('Content-Type', gasRes.headers.get('content-type') || 'application/json; charset=utf-8');
        return res.status(gasRes.status).send(dataText);
      } else {
        // POST / PUT / DELETE
        let bodyPayload: string;
        if (typeof req.body === 'string') {
          bodyPayload = req.body;
        } else if (req.body && typeof req.body === 'object') {
          bodyPayload = JSON.stringify(req.body);
        } else {
          bodyPayload = '{}';
        }

        const gasRes = await fetch(targetUrl, {
          method: 'POST',
          redirect: 'follow',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: bodyPayload,
        });

        const dataText = await gasRes.text();
        res.setHeader('Content-Type', gasRes.headers.get('content-type') || 'application/json; charset=utf-8');
        return res.status(gasRes.status).send(dataText);
      }
    } catch (err: any) {
      console.error('[API Proxy /api/gas error]:', err.message);
      return res.status(502).json({
        success: false,
        message: `Proxy server error saat menghubungi Google Apps Script: ${err.message || 'Error'}`,
      });
    }
  });

  // =========================================================================
  // PHOTO PROXY: /api/photo
  // Melayani foto peserta Google Drive dengan caching super cepat
  // =========================================================================
  app.get('/api/photo', async (req, res) => {
    try {
      const fileId = (req.query.id as string || '').trim();
      if (!fileId) {
        return res.status(400).send('File ID is required');
      }

      const cdnUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
      const imgRes = await fetch(cdnUrl, { redirect: 'follow' });

      if (imgRes.ok) {
        res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        const arrayBuffer = await imgRes.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }

      // Fallback ke Drive thumbnail endpoint
      const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`;
      const thumbRes = await fetch(thumbUrl, { redirect: 'follow' });
      if (thumbRes.ok) {
        res.setHeader('Content-Type', thumbRes.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const arrayBuffer = await thumbRes.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }

      return res.status(imgRes.status).send('Unable to load photo');
    } catch (err: any) {
      console.warn('[Photo Proxy Error]:', err.message);
      return res.status(500).send(err.message);
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      gasUrl: GAS_URL,
      spreadsheetId: '18d2NpE-Y4cm19LjNWo7UPZdMPdcv8CQImRcF3jupTa8',
      driveId: '1mQwSeNLsVGFaNzTKqbUyV4-NeViBuObo',
      timestamp: new Date().toISOString(),
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server DIGITALMEERA berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
