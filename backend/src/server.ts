import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { parseRouter } from './routes/parse.js';
import { generateRouter } from './routes/generate.js';
import { githubRouter } from './routes/github.js';
import { authRouter } from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/parse', parseRouter);
app.use('/api/generate', generateRouter);
app.use('/api/github', githubRouter);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});

export default app;
