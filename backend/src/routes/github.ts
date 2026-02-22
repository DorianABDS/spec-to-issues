import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middlewares/auth.js';
import { getUserRepos, getOrgRepos, createIssues } from '../services/github.service.js';
import { GeneratedIssue } from '../types/index.js';

export const githubRouter = Router();

// ── List repos ────────────────────────────────────────────────────────────────
githubRouter.get('/repos', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { org } = req.query;
  try {
    const repos = org
      ? await getOrgRepos(req.user!.github_token, String(org))
      : await getUserRepos(req.user!.github_token);
    res.json(repos.map(r => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      private: r.private,
      description: r.description,
      owner: r.owner, // already a string
    })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GitHub error';
    res.status(500).json({ error: message });
  }
});

// ── Create issues ─────────────────────────────────────────────────────────────
githubRouter.post('/create-issues', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { owner, repo, issues } = req.body as {
    owner: string;
    repo: string;
    issues: GeneratedIssue[];
  };

  if (!owner || !repo) return res.status(400).json({ error: 'owner and repo are required' });
  if (!Array.isArray(issues) || issues.length === 0) {
    return res.status(400).json({ error: 'issues array is required and must not be empty' });
  }
  if (issues.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 issues per batch' });
  }

  try {
    const result = await createIssues(req.user!.github_token, owner, repo, issues);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GitHub create error';
    res.status(500).json({ error: message });
  }
});

// ── Dry run preview ───────────────────────────────────────────────────────────
githubRouter.post('/dry-run', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { issues } = req.body as { issues: GeneratedIssue[] };
  if (!Array.isArray(issues)) return res.status(400).json({ error: 'issues required' });

  res.json({
    preview: issues.map(i => ({
      title: i.title,
      labels: i.labels,
      assignees: i.assignees,
      milestone: i.milestone,
      priority: i.priority,
    })),
    total: issues.length,
    dry_run: true,
  });
});