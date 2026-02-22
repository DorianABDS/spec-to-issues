import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middlewares/auth.js';

export const generateRouter = Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es un expert en gestion de projet. Tu analyses des GDD et cahiers des charges pour les transformer en issues GitHub structurées.

Tes issues doivent être claires, découpées finement, en français, avec des critères d'acceptation mesurables.

Tu réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après, sans markdown, sans backticks.`;

function buildPrompt(content, teamConfig, projectName, projectType) {
  const members = teamConfig.members
    .filter(m => m.active)
    .map(m => `- ${m.name} (@${m.github_handle}) : ${m.roles.join(', ')}`)
    .join('\n');

  return `Analyse ce document et génère des issues GitHub.

Projet : ${projectName || 'Non défini'}
Type : ${projectType || 'Non défini'}

ÉQUIPE :
${members || 'Aucun membre'}

DOCUMENT :
---
${content.substring(0, 15000)}
---

Réponds avec ce JSON exact :
{
  "issues": [
    {
      "title": "Titre court et descriptif",
      "body": "Description détaillée en Markdown",
      "acceptance_criteria": ["Critère 1", "Critère 2"],
      "labels": ["label1", "label2"],
      "assignees": ["github_handle"],
      "milestone": "Nom du milestone ou null",
      "priority": "haute | moyenne | basse",
      "estimated_effort": "2-3h ou null"
    }
  ]
}

Labels disponibles : scripting, building, ui-design, 3d-art, game-design, bug, feature, enhancement, documentation, sound-design.
Découpe finement : préfère 10 issues précises à 3 vagues.`;
}

generateRouter.post('/', authMiddleware, async (req, res) => {
  const { content, team_config, project_name, project_type } = req.body;

  if (!content) return res.status(400).json({ error: 'content requis' });
  if (!team_config) return res.status(400).json({ error: 'team_config requis' });

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt(content, team_config, project_name, project_type) }],
    });

    const rawText = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const issues = parsed.issues.map((issue, i) => ({
      id: `issue-${Date.now()}-${i}`,
      title: issue.title || 'Sans titre',
      body: issue.body || '',
      acceptance_criteria: issue.acceptance_criteria || [],
      labels: issue.labels || [],
      assignees: issue.assignees || [],
      milestone: issue.milestone || null,
      priority: issue.priority || 'moyenne',
      estimated_effort: issue.estimated_effort || null,
    }));

    res.json({ issues, total: issues.length, model_used: message.model });
  } catch (err) {
    console.error('[Generate]', err.message);
    res.status(500).json({ error: err.message });
  }
});
