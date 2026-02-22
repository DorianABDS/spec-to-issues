import { Router } from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { marked } from 'marked';
import axios from 'axios';
import { authMiddleware } from '../middlewares/auth.js';

export const parseRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ── Parse text ────────────────────────────────────────────────────────────────
parseRouter.post('/text', authMiddleware, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });
  res.json({ content: text.trim(), source: 'text', char_count: text.length });
});

// ── Parse file ────────────────────────────────────────────────────────────────
parseRouter.post('/file', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  try {
    const { buffer, mimetype, originalname } = req.file;
    const ext = originalname.split('.').pop()?.toLowerCase();
    let content = '';

    if (mimetype === 'application/pdf' || ext === 'pdf') {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buffer);
      content = data.text;
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else if (ext === 'md') {
      const html = await marked(buffer.toString('utf-8'));
      content = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } else {
      content = buffer.toString('utf-8');
    }

    res.json({ content, source: 'file', filename: originalname, char_count: content.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Parse URL ─────────────────────────────────────────────────────────────────
parseRouter.post('/url', authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  try {
    let content = '';

    if (url.includes('docs.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (!match) throw new Error('Invalid Google Docs URL');
      const { data } = await axios.get(
        `https://docs.google.com/document/d/${match[1]}/export?format=txt`,
        { timeout: 15000 }
      );
      content = String(data);
    } else {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000,
      });
      content = String(data)
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    res.json({ content, source: 'url', char_count: content.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
