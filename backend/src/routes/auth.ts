import { Router, Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { getUser } from '../services/github.service.js';

export const authRouter = Router();

// ── Step 1: Redirect to GitHub OAuth ─────────────────────────────────────────
authRouter.get('/github', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || '',
    redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/github/callback`,
    scope: 'repo read:org',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// ── Step 2: GitHub callback → exchange code for token ────────────────────────
authRouter.get('/github/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    // Exchange code for access token
    const { data: tokenData } = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description });
    }

    const github_token = tokenData.access_token;
    const ghUser = await getUser(github_token);

    // Create JWT containing the GitHub token (never exposed to client directly)
    const jwtToken = jwt.sign(
      { github_token, login: ghUser.login, id: ghUser.id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '24h' }
    );

    // Redirect to frontend with JWT
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}&login=${ghUser.login}&avatar=${encodeURIComponent(ghUser.avatar_url)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth error';
    res.status(500).json({ error: message });
  }
});

// ── Get current user info ─────────────────────────────────────────────────────
authRouter.get('/me', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
      github_token: string; login: string; id: number;
    };
    const user = await getUser(decoded.github_token);
    res.json({ login: user.login, name: user.name, avatar_url: user.avatar_url });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});
