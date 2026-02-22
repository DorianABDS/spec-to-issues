import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { generateIssues } from '../services/claude.service.js';
import { authMiddleware, AuthRequest } from '../middlewares/auth.js';
import { TeamConfig } from '../types/index.js';

export const generateRouter = Router();

// Rate limit: 10 generations per hour per user
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de générations. Limite : 10 par heure.' },
  keyGenerator: (req) => (req as AuthRequest).user?.login || req.ip || 'unknown',
});

generateRouter.post('/', authMiddleware, generateLimiter, async (req: AuthRequest, res: Response) => {
  const { content, team_config, project_name, project_type } = req.body as {
    content: string;
    team_config: TeamConfig;
    project_name?: string;
    project_type?: string;
  };

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required' });
  }

  if (!team_config || !Array.isArray(team_config.members)) {
    return res.status(400).json({ error: 'team_config is required' });
  }

  try {
    const result = await generateIssues(content, team_config, project_name, project_type);
    res.json({
      issues: result.issues,
      total: result.issues.length,
      model_used: result.model_used,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation error';
    console.error('[Generate]', message);
    res.status(500).json({ error: message });
  }
});
