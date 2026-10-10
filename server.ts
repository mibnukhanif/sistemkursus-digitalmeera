import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbx310Kdmr4FD6CcAuSwfKqNO-8zDZ0TdQLc3RBILogU3DwpOHM6XOUw1hZLERNyVR3BZg/exec';
const GAS_URL = (process.env.VITE_API_URL || DEFAULT_GAS_URL).trim();

async function startServer() {
  const app = express();

  // Middleware body parsing
  app.use(express.json({ limit: '25mb' }));
  app.use(express.text({ type: ['text/*', 'application/javascript'], limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // =========================================================================
  // PERSISTENSI LOGO CUSTOM
  // =========================================================================
  const LOGO_FILE = path.resolve(__dirname, 'data', 'logo.json');
  let memoryLogo = '';
  try {
    if (fs.existsSync(LOGO_FILE)) {
      const saved = JSON.parse(fs.readFileSync(LOGO_FILE, 'utf-8'));
      memoryLogo = saved.logo || '';
    }
  } catch {}

  // =========================================================================
  // API PROXY: /api/gas
  // Meneruskan request ke Google Apps Script tanpa CORS & iframe redirect blocker
  // =========================================================================
  app.all('/api/gas', async (req, res) => {
    try {
      const clientCustomUrl = (req.headers['x-gas-url'] as string || '').trim();
      const targetUrl = (clientCustomUrl && clientCustomUrl.startsWith('https://script.google.com/macros/s/'))
        ? clientCustomUrl
        : GAS_URL;
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

        // Pastikan logo custom diinjeksi jika data profil dikembalikan
        try {
          const parsed = JSON.parse(dataText);
          if (parsed && typeof parsed === 'object') {
            if (memoryLogo) {
              if (parsed.data?.profil) {
                parsed.data.profil.logo = memoryLogo;
              }
              if (parsed.profil) {
                parsed.profil.logo = memoryLogo;
              }
            }
            return res.status(gasRes.status).json(parsed);
          }
        } catch {}

        return res.status(gasRes.status).send(dataText);
      } else {
        // POST / PUT / DELETE
        let bodyPayload: string;
        let parsedBody: any = null;
        if (typeof req.body === 'string') {
          bodyPayload = req.body;
          try { parsedBody = JSON.parse(req.body); } catch {}
        } else if (req.body && typeof req.body === 'object') {
          bodyPayload = JSON.stringify(req.body);
          parsedBody = req.body;
        } else {
          bodyPayload = '{}';
        }

        // Tangkap dan simpan logo jika aksi updateProfil dipanggil
        if (parsedBody && parsedBody.action === 'updateProfil' && typeof parsedBody.logo === 'string') {
          memoryLogo = parsedBody.logo;
          try {
            const dir = path.dirname(LOGO_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(LOGO_FILE, JSON.stringify({ logo: memoryLogo, updatedAt: new Date().toISOString() }));
          } catch {}
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

        try {
          const parsed = JSON.parse(dataText);
          if (parsed && typeof parsed === 'object') {
            if (memoryLogo) {
              if (parsed.data?.profil) {
                parsed.data.profil.logo = memoryLogo;
              }
              if (parsed.profil) {
                parsed.profil.logo = memoryLogo;
              }
            }
            return res.status(gasRes.status).json(parsed);
          }
        } catch {}

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

  // =========================================================================
  // LOGO PERSISTENCE API: /api/logo
  // Memastikan logo custom tersimpan secara permanen lintas refresh & logout
  // =========================================================================
  app.get('/api/logo', (req, res) => {
    res.json({ success: true, logo: memoryLogo });
  });

  app.post('/api/logo', (req, res) => {
    const { logo } = req.body || {};
    memoryLogo = typeof logo === 'string' ? logo : '';
    try {
      const dir = path.dirname(LOGO_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(LOGO_FILE, JSON.stringify({ logo: memoryLogo, updatedAt: new Date().toISOString() }));
    } catch (e: any) {
      console.warn('Gagal menulis logo file:', e.message);
    }
    res.json({ success: true, logo: memoryLogo });
  });

  app.delete('/api/logo', (req, res) => {
    memoryLogo = '';
    try {
      if (fs.existsSync(LOGO_FILE)) {
        fs.writeFileSync(LOGO_FILE, JSON.stringify({ logo: '', updatedAt: new Date().toISOString() }));
      }
    } catch {}
    res.json({ success: true, message: 'Logo berhasil dihapus' });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      gasUrl: GAS_URL,
      spreadsheetId: '1jejmJlaGXD7AYxu6bVVXC7sQWFXaL81hW0lzEP3anTY',
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
