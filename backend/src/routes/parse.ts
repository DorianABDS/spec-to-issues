import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseFile, parseUrl } from '../services/parser.service.js';
import { authMiddleware, AuthRequest } from '../middlewares/auth.js';

export const parseRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/markdown', 'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExt = ['pdf', 'md', 'txt', 'docx'];
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Format non supporté : ${file.mimetype}`));
    }
  },
});

// ── Parse uploaded file ───────────────────────────────────────────────────────
parseRouter.post('/file', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  try {
    const content = await parseFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    res.json({
      content,
      source: 'file',
      filename: req.file.originalname,
      char_count: content.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse error';
    res.status(500).json({ error: message });
  }
});

// ── Parse raw text ────────────────────────────────────────────────────────────
parseRouter.post('/text', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'No text provided' });
  }
  res.json({ content: text.trim(), source: 'text', char_count: text.length });
});

// ── Parse URL ─────────────────────────────────────────────────────────────────
parseRouter.post('/url', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' });
  }

  try {
    const content = await parseUrl(url);
    res.json({ content, source: 'url', char_count: content.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'URL parse error';
    res.status(500).json({ error: message });
  }
});
