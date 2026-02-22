import Anthropic from '@anthropic-ai/sdk';
import { GeneratedIssue, TeamConfig } from '../types/index.js';
import { randomUUID } from 'crypto';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es un expert en gestion de projet et développement de jeux Roblox / logiciels.
Tu analyses des GDD (Game Design Documents) et cahiers des charges pour les transformer en issues GitHub structurées et actionnables.

Tes issues doivent être :
- Claires, concises et directement actionnables
- Correctement découpées (une tâche = une issue)
- En français
- Avec des critères d'acceptation mesurables

Tu réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après. Jamais de markdown, jamais de backticks.`;

function buildPrompt(content: string, team: TeamConfig, projectName?: string, projectType?: string): string {
  const memberList = team.members
    .filter(m => m.active)
    .map(m => `- ${m.name} (@${m.github_handle}) : ${m.roles.join(', ')}`)
    .join('\n');

  const rules = Object.entries(team.assignment_rules)
    .map(([task, roles]) => `- Tâches "${task}" → assignées aux rôles : ${roles.join(', ')}`)
    .join('\n');

  return `Analyse le document suivant et génère une liste d'issues GitHub.

${projectName ? `Projet : ${projectName}` : ''}
${projectType ? `Type : ${projectType}` : ''}

ÉQUIPE DISPONIBLE :
${memberList || 'Aucun membre défini'}

RÈGLES D\'ASSIGNATION :
${rules || 'Pas de règles définies, laisser assignees vide'}

DOCUMENT À ANALYSER :
---
${content.substring(0, 15000)}
---

Génère un JSON avec cette structure exacte :
{
  "issues": [
    {
      "title": "Titre court et descriptif de l'issue",
      "body": "Description détaillée en Markdown avec contexte, objectif et détails techniques",
      "acceptance_criteria": ["Critère 1 vérifiable", "Critère 2 vérifiable"],
      "labels": ["label1", "label2"],
      "assignees": ["github_handle"],
      "milestone": "Nom du milestone ou null",
      "priority": "haute | moyenne | basse",
      "estimated_effort": "2-3h ou null"
    }
  ]
}

Labels suggérés selon le type de tâche : scripting, building, ui-design, 3d-art, game-design, bug, feature, enhancement, documentation, sound-design.
Priorité haute = bloquant ou critique. Moyenne = important. Basse = nice-to-have.
Découpe finement : évite les issues trop larges. Préfère 10 issues précises à 3 issues vagues.`;
}

export async function generateIssues(
  content: string,
  team: TeamConfig,
  projectName?: string,
  projectType?: string
): Promise<{ issues: GeneratedIssue[]; model_used: string }> {
  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildPrompt(content, team, projectName, projectType) }
    ],
  });

  const rawText = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  let parsed: { issues: Omit<GeneratedIssue, 'id'>[] };
  try {
    // Strip any accidental markdown code fences
    const clean = rawText.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${rawText.substring(0, 200)}`);
  }

  const issues: GeneratedIssue[] = parsed.issues.map(issue => ({
    ...issue,
    id: randomUUID(),
    acceptance_criteria: issue.acceptance_criteria || [],
    labels: issue.labels || [],
    assignees: issue.assignees || [],
    milestone: issue.milestone || null,
    estimated_effort: issue.estimated_effort || null,
  }));

  return { issues, model_used: message.model };
}