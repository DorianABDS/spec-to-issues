import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';

export const authRouter = Router();

// ── Redirect to GitHub OAuth ──────────────────────────────────────────────────
authRouter.get('/github', (_req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || '',
    redirect_uri: `${process.env.BACKEND_URL}/api/auth/github/callback`,
    scope: 'repo read:org',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// ── GitHub callback ───────────────────────────────────────────────────────────
authRouter.get('/github/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
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

    // Get GitHub user info
    const { data: ghUser } = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${github_token}` },
    });

    const jwtToken = jwt.sign(
      { github_token, login: ghUser.login, id: ghUser.id, avatar_url: ghUser.avatar_url },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '24h' }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    return res.redirect(
      `${frontendUrl}/auth-callback.html?token=${jwtToken}&login=${ghUser.login}&avatar=${encodeURIComponent(ghUser.avatar_url)}`
    );
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Get current user ──────────────────────────────────────────────────────────
authRouter.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    res.json({ login: decoded.login, avatar_url: decoded.avatar_url });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});
