import axios from 'axios';
import { ParsedContent, GeneratedIssue, TeamConfig, GitHubRepo, CreatedIssue } from '../types';

// Must match the `name` field in app.store.ts persist config
const STORE_KEY = 'gdd-app-state';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach JWT from store
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try {
      const state = JSON.parse(raw);
      const token = state?.state?.user?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch { /* ignore */ }
  }
  return config;
});

// ─── Parse ────────────────────────────────────────────────────────────────────
export async function parseText(text: string): Promise<ParsedContent> {
  const { data } = await api.post('/parse/text', { text });
  return data;
}

export async function parseFile(file: File): Promise<ParsedContent> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/parse/file', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function parseUrl(url: string): Promise<ParsedContent> {
  const { data } = await api.post('/parse/url', { url });
  return data;
}

// ─── Generate ─────────────────────────────────────────────────────────────────
export async function generateIssues(
  content: string,
  team_config: TeamConfig,
  project_name: string,
  project_type: string
): Promise<{ issues: GeneratedIssue[]; total: number; model_used: string }> {
  const { data } = await api.post('/generate', {
    content,
    team_config,
    project_name,
    project_type,
  });
  return data;
}

// ─── GitHub ───────────────────────────────────────────────────────────────────
export async function fetchRepos(org?: string): Promise<GitHubRepo[]> {
  const params = org ? { org } : {};
  const { data } = await api.get('/github/repos', { params });
  return data;
}

export async function createIssues(
  owner: string,
  repo: string,
  issues: GeneratedIssue[]
): Promise<{ created: CreatedIssue[]; failed: Array<{ title: string; error: string }>; total_created: number }> {
  const { data } = await api.post('/github/create-issues', { owner, repo, issues });
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export function getGitHubLoginUrl(): string {
  const base = import.meta.env.VITE_API_URL || '/api';
  return `${base}/auth/github`;
}