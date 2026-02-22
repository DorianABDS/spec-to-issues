import axios from 'axios';
import { GeneratedIssue, GitHubRepo, GitHubUser, CreateIssuesResponse } from '../types/index.js';

const GH_API = 'https://api.github.com';

function ghClient(token: string) {
  return axios.create({
    baseURL: GH_API,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}

export async function getUser(token: string): Promise<GitHubUser> {
  const { data } = await ghClient(token).get('/user');
  return data;
}

export async function getUserRepos(token: string): Promise<GitHubRepo[]> {
  const { data } = await ghClient(token).get('/user/repos', {
    params: { sort: 'updated', per_page: 100, type: 'all' },
  });
  return data;
}

export async function getOrgRepos(token: string, org: string): Promise<GitHubRepo[]> {
  const { data } = await ghClient(token).get(`/orgs/${org}/repos`, {
    params: { sort: 'updated', per_page: 100, type: 'all' },
  });
  return data;
}

export async function ensureLabels(
  token: string,
  owner: string,
  repo: string,
  labels: string[]
): Promise<void> {
  const client = ghClient(token);
  const labelColors: Record<string, string> = {
    scripting: '0075ca',
    building: '2ea44f',
    'ui-design': 'f9d0c4',
    '3d-art': 'e4e669',
    'game-design': 'a2eeef',
    bug: 'd73a4a',
    feature: '0075ca',
    enhancement: 'a2eeef',
    documentation: '0075ca',
    'sound-design': 'e99695',
    'haute-priorité': 'b60205',
    'moyenne-priorité': 'fbca04',
    'basse-priorité': '0e8a16',
  };

  for (const label of labels) {
    try {
      await client.post(`/repos/${owner}/${repo}/labels`, {
        name: label,
        color: labelColors[label] || 'ededed',
      });
    } catch {
      // Label already exists → ignore
    }
  }
}

export async function ensureMilestone(
  token: string,
  owner: string,
  repo: string,
  title: string
): Promise<number | undefined> {
  const client = ghClient(token);
  try {
    // Check existing milestones
    const { data: milestones } = await client.get(`/repos/${owner}/${repo}/milestones`);
    const existing = milestones.find((m: { title: string; number: number }) => m.title === title);
    if (existing) return existing.number;

    // Create new milestone
    const { data } = await client.post(`/repos/${owner}/${repo}/milestones`, { title });
    return data.number;
  } catch {
    return undefined;
  }
}

export async function createIssues(
  token: string,
  owner: string,
  repo: string,
  issues: GeneratedIssue[]
): Promise<CreateIssuesResponse> {
  const client = ghClient(token);
  const created: CreateIssuesResponse['created'] = [];
  const failed: CreateIssuesResponse['failed'] = [];

  // Collect all unique labels and ensure they exist
  const allLabels = [...new Set(issues.flatMap(i => i.labels))];
  await ensureLabels(token, owner, repo, allLabels);

  // Collect unique milestones and create them
  const milestoneMap: Record<string, number> = {};
  const uniqueMilestones = [...new Set(issues.map(i => i.milestone).filter(Boolean))] as string[];
  for (const ms of uniqueMilestones) {
    const num = await ensureMilestone(token, owner, repo, ms);
    if (num) milestoneMap[ms] = num;
  }

  // Create issues one by one (GitHub API doesn't support batch)
  for (const issue of issues) {
    try {
      // Build body with acceptance criteria
      let fullBody = issue.body;
      if (issue.acceptance_criteria.length > 0) {
        fullBody += '\n\n## ✅ Critères d\'acceptation\n';
        fullBody += issue.acceptance_criteria.map(c => `- [ ] ${c}`).join('\n');
      }
      if (issue.estimated_effort) {
        fullBody += `\n\n**Effort estimé :** ${issue.estimated_effort}`;
      }
      fullBody += `\n\n**Priorité :** ${issue.priority}`;

      const payload: Record<string, unknown> = {
        title: issue.title,
        body: fullBody,
        labels: issue.labels,
        assignees: issue.assignees,
      };

      if (issue.milestone && milestoneMap[issue.milestone]) {
        payload.milestone = milestoneMap[issue.milestone];
      }

      const { data } = await client.post(`/repos/${owner}/${repo}/issues`, payload);
      created.push({ title: issue.title, url: data.html_url, number: data.number });

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      failed.push({ title: issue.title, error: message });
    }
  }

  return { created, failed, total_created: created.length };
}
