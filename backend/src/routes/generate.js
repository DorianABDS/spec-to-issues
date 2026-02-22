import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middlewares/auth.js';

export const generateRouter = Router();

const client = new Anthropic();

const SYSTEM_PROMPT = `Tu es un expert en gestion de projet et développement logiciel. Tu analyses des GDD et cahiers des charges pour les transformer en issues GitHub professionnelles destinées à des développeurs seniors.

Tes issues doivent être :
- Précises et actionnables
- Avec des critères d'acceptation mesurables et testables
- Bien découpées (une issue = une tâche claire)
- En français
- Avec une description technique suffisamment détaillée

Tu réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après, sans markdown, sans backticks.`;

function buildPrompt(content, teamConfig, projectName, projectType, phase) {
  const members = teamConfig.members
    .filter(m => m.active)
    .map(m => `- ${m.name} (@${m.github_handle}) : ${m.roles.join(', ')}`)
    .join('\n');

  const phaseInstructions = phase === 'mvp'
    ? `Génère UNIQUEMENT les issues du MVP (Minimum Viable Product).
Ce sont les fonctionnalités essentielles et indispensables pour avoir un jeu jouable.
Le milestone de toutes ces issues doit être exactement : "MVP"
Génère entre 20 et 30 issues couvrant tous les rôles de l'équipe.`
    : `Génère UNIQUEMENT les issues Post-MVP (améliorations, polish, features secondaires).
Ce sont les fonctionnalités non essentielles, le polish, les optimisations et les features bonus.
Le milestone de toutes ces issues doit être exactement : "Post-MVP"
Génère entre 15 et 25 issues couvrant tous les rôles de l'équipe.`;

  return `Analyse ce document et génère des issues GitHub.

Projet : ${projectName || 'Non défini'}
Type : ${projectType || 'Non défini'}

ÉQUIPE :
${members || 'Aucun membre'}

PHASE : ${phase.toUpperCase()}
${phaseInstructions}

DOCUMENT :
---
${content.substring(0, 8000)}
---

Réponds avec ce JSON exact :
{
  "issues": [
    {
      "title": "Titre court",
      "body": "2-3 phrases : contexte + comportement attendu + note technique si besoin",
      "acceptance_criteria": ["Critère 1", "Critère 2"],
      "labels": ["label1"],
      "assignees": ["github_handle"],
      "milestone": "${phase === 'mvp' ? 'MVP' : 'Post-MVP'}",
      "priority": "haute | moyenne | basse",
      "estimated_effort": "2-3h"
    }
  ]
}

Labels disponibles : scripting, building, ui-design, 3d-art, game-design, bug, feature, enhancement, documentation, sound-design.
IMPORTANT : body = 2-3 phrases max, maximum 2 critères par issue, titres courts.
Assigne chaque issue au membre dont le rôle correspond.`;
}

async function callClaude(prompt) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content[0]?.text || '';
  const clean = rawText.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  return parsed.issues || [];
}

generateRouter.post('/', authMiddleware, async (req, res) => {
  const { content, team_config, project_name, project_type } = req.body;

  if (!content) return res.status(400).json({ error: 'content requis' });
  if (!team_config) return res.status(400).json({ error: 'team_config requis' });

  try {
    // Appel 1 : MVP
    console.log('[Generate] Génération MVP...');
    const mvpPrompt = buildPrompt(content, team_config, project_name, project_type, 'mvp');
    const mvpIssues = await callClaude(mvpPrompt);
    console.log(`[Generate] MVP : ${mvpIssues.length} issues`);

    // Appel 2 : Post-MVP
    console.log('[Generate] Génération Post-MVP...');
    const postMvpPrompt = buildPrompt(content, team_config, project_name, project_type, 'post-mvp');
    const postMvpIssues = await callClaude(postMvpPrompt);
    console.log(`[Generate] Post-MVP : ${postMvpIssues.length} issues`);

    // Fusion
    const allIssues = [...mvpIssues, ...postMvpIssues].map((issue, i) => ({
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

    console.log(`[Generate] Total : ${allIssues.length} issues générées`);
    res.json({ issues: allIssues, total: allIssues.length, model_used: 'claude-sonnet-4-5' });
  } catch (err) {
    console.error('[Generate]', err.message);
    res.status(500).json({ error: err.message });
  }
});