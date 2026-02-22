import { Router } from 'express';
import axios from 'axios';
import { authMiddleware } from '../middlewares/auth.js';

export const githubRouter = Router();

function gh(token) {
  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}

// ── List repos ────────────────────────────────────────────────────────────────
githubRouter.get('/repos', authMiddleware, async (req, res) => {
  try {
    const { data } = await gh(req.user.github_token).get('/user/repos', {
      params: { sort: 'updated', per_page: 100, type: 'all' },
    });
    res.json(data.map(r => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      private: r.private,
      description: r.description,
      owner: r.owner.login,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create issues ─────────────────────────────────────────────────────────────
githubRouter.post('/create-issues', authMiddleware, async (req, res) => {
  const { owner, repo, issues } = req.body;
  if (!owner || !repo) return res.status(400).json({ error: 'owner et repo requis' });
  if (!Array.isArray(issues) || issues.length === 0) return res.status(400).json({ error: 'issues requis' });

  const client = gh(req.user.github_token);
  const created = [];
  const failed = [];

  // Create labels
  const labelColors = {
    scripting: '0075ca', building: '2ea44f', 'ui-design': 'f9d0c4',
    '3d-art': 'e4e669', 'game-design': 'a2eeef', bug: 'd73a4a',
    feature: '0075ca', enhancement: 'a2eeef', documentation: '0075ca', 'sound-design': 'e99695',
  };
  const allLabels = [...new Set(issues.flatMap(i => i.labels))];
  for (const label of allLabels) {
    try {
      await client.post(`/repos/${owner}/${repo}/labels`, {
        name: label, color: labelColors[label] || 'ededed',
      });
    } catch { /* already exists */ }
  }

  // Create milestones
  const milestoneMap = {};
  const milestones = [...new Set(issues.map(i => i.milestone).filter(Boolean))];
  for (const ms of milestones) {
    try {
      const { data: existing } = await client.get(`/repos/${owner}/${repo}/milestones`);
      const found = existing.find(m => m.title === ms);
      if (found) {
        milestoneMap[ms] = found.number;
      } else {
        const { data } = await client.post(`/repos/${owner}/${repo}/milestones`, { title: ms });
        milestoneMap[ms] = data.number;
      }
    } catch { /* ignore */ }
  }

  // Create issues one by one
  for (const issue of issues) {
    try {
      let body = issue.body;
      if (issue.acceptance_criteria?.length) {
        body += '\n\n## ✅ Critères d\'acceptation\n';
        body += issue.acceptance_criteria.map(c => `- [ ] ${c}`).join('\n');
      }
      if (issue.estimated_effort) body += `\n\n**Effort estimé :** ${issue.estimated_effort}`;
      body += `\n\n**Priorité :** ${issue.priority}`;

      const payload = {
        title: issue.title,
        body,
        labels: issue.labels,
        assignees: issue.assignees,
      };
      if (issue.milestone && milestoneMap[issue.milestone]) {
        payload.milestone = milestoneMap[issue.milestone];
      }

      const { data } = await client.post(`/repos/${owner}/${repo}/issues`, payload);
      created.push({ title: issue.title, url: data.html_url, number: data.number });
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      failed.push({ title: issue.title, error: err.message });
    }
  }

  res.json({ created, failed, total_created: created.length });
});

// ── Dry run ───────────────────────────────────────────────────────────────────
githubRouter.post('/dry-run', authMiddleware, (req, res) => {
  const { issues } = req.body;
  if (!Array.isArray(issues)) return res.status(400).json({ error: 'issues requis' });
  res.json({
    preview: issues.map(i => ({ title: i.title, labels: i.labels, priority: i.priority })),
    total: issues.length,
    dry_run: true,
  });
});
