import { Router } from 'express';
import axios from 'axios';
import { authMiddleware } from '../middlewares/auth.js';

export const generateRouter = Router();

const SYSTEM_PROMPT = `Tu es un expert en gestion de projet. Tu analyses des GDD et cahiers des charges pour les transformer en issues GitHub structurées.

Tes issues doivent être claires, découpées finement, en français, avec des critères d'acceptation mesurables.

Tu réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après, sans markdown, sans backticks.`;

function buildPrompt(content, teamConfig, projectName, projectType) {
  const members = teamConfig.members
    .filter(m => m.active)
    .map(m => `- ${m.name} (@${m.github_handle}) : ${m.roles.join(', ')}`)
    .join('\n');

  return `${SYSTEM_PROMPT}

Analyse ce document et génère des issues GitHub.

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
    const prompt = buildPrompt(content, team_config, project_name, project_type);

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      }
    );

    const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

    res.json({ issues, total: issues.length, model_used: 'gemini-1.5-flash' });
  } catch (err) {
    console.error('[Generate]', err.message);
    res.status(500).json({ error: err.message });
  }
});