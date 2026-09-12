import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for large payload (e.g. high-res images)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API to save background image permanently to public folder
  app.post('/api/upload-background', (req, res) => {
    try {
      const { dataUrl } = req.body;
      if (!dataUrl) {
        return res.status(400).json({ error: 'No dataUrl provided' });
      }
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      const targetPath = path.join(publicDir, 'QN26_Certificate.png');
      fs.writeFileSync(targetPath, buffer);

      // Also copy to dist/ if dist exists
      const distDir = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distDir)) {
        fs.writeFileSync(path.join(distDir, 'QN26_Certificate.png'), buffer);
      }

      console.log('Successfully saved QN26_Certificate.png to public/');
      return res.json({ success: true, url: '/QN26_Certificate.png' });
    } catch (err: any) {
      console.error('Failed to save background image:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API to check if custom certificate exists on server
  app.get('/api/background-status', (req, res) => {
    const publicPath = path.join(process.cwd(), 'public', 'QN26_Certificate.png');
    const exists = fs.existsSync(publicPath);
    res.json({ exists, url: exists ? '/QN26_Certificate.png' : null });
  });

  // API to check if race logo exists on server
  app.get('/api/logo-status', (req, res) => {
    const publicPath = path.join(process.cwd(), 'public', 'race_logo.png');
    const exists = fs.existsSync(publicPath);
    res.json({ exists, url: exists ? '/race_logo.png' : null });
  });

  // Proxy API for Google Apps Script to bypass browser CORS
  app.get('/api/proxy-sheet', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
      });
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        return res.json(json);
      }
      const text = await response.text();
      return res.send(text);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Proxy API to fetch remote background image (e.g. Google Drive, external URL) and bypass CORS
  app.get('/api/proxy-image', async (req, res) => {
    let targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
      // If Google Drive link, normalize to direct download/thumbnail link
      if (targetUrl.includes('drive.google.com')) {
        let fileId = '';
        const matchFile = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const matchId = targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (matchFile && matchFile[1]) {
          fileId = matchFile[1];
        } else if (matchId && matchId[1]) {
          fileId = matchId[1];
        }

        if (fileId) {
          // Google user content direct high-res link
          targetUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
        }
      }

      const imgResp = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
      });

      if (!imgResp.ok) {
        // Fallback for google drive uc?export=view
        if (targetUrl.includes('googleusercontent.com/d/')) {
          const fileId = targetUrl.split('/').pop();
          const fallbackUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
          const fallbackResp = await fetch(fallbackUrl);
          if (fallbackResp.ok) {
            const buffer = Buffer.from(await fallbackResp.arrayBuffer());
            const contentType = fallbackResp.headers.get('content-type') || 'image/png';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(buffer);
          }
        }
        return res.status(imgResp.status).send(`Failed to fetch image: HTTP ${imgResp.status}`);
      }

      const contentType = imgResp.headers.get('content-type') || 'image/png';
      const arrayBuffer = await imgResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Check if response is actually an HTML login/error page instead of an image
      const isHtml = contentType.includes('text/html') || (buffer.length > 0 && buffer[0] === 0x3C && buffer[1] === 0x21); // '<!'
      if (isHtml) {
        return res.status(403).json({ 
          error: 'File Google Drive chưa được bật quyền công khai ("Bất kỳ ai có liên kết"). Vui lòng kiểm tra quyền chia sẻ file.',
          isPermissionError: true
        });
      }

      // Save image to public folder (differentiating logo and certificate background)
      try {
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        
        const isLogo = req.query.type === 'logo' || targetUrl.toLowerCase().includes('logo');
        if (isLogo) {
          fs.writeFileSync(path.join(publicDir, 'race_logo.png'), buffer);
        } else if (req.query.type === 'background' || !fs.existsSync(path.join(publicDir, 'QN26_Certificate.png'))) {
          fs.writeFileSync(path.join(publicDir, 'QN26_Certificate.png'), buffer);
        }
      } catch (saveErr) {
        console.warn('Could not auto-save image to disk:', saveErr);
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    } catch (err: any) {
      console.error('Error proxying image:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Serve static files from public directory
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
