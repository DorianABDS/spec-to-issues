// ─── Issue types ────────────────────────────────────────────────────────────

export type Priority = 'haute' | 'moyenne' | 'basse';

export interface GeneratedIssue {
  id: string;
  title: string;
  body: string;
  acceptance_criteria: string[];
  labels: string[];
  assignees: string[];
  milestone: string | null;
  priority: Priority;
  estimated_effort: string | null;
}

// ─── Team config ─────────────────────────────────────────────────────────────

export type MemberRole = 'scripter' | 'builder' | 'ui_designer' | '3d_artist' | 'game_designer' | 'sound_designer';

export interface TeamMember {
  name: string;
  github_handle: string;
  roles: MemberRole[];
  active: boolean;
}

export interface AssignmentRules {
  [taskType: string]: MemberRole[];
}

export interface TeamConfig {
  members: TeamMember[];
  assignment_rules: AssignmentRules;
}

// ─── Request/Response ────────────────────────────────────────────────────────

export interface ParseRequest {
  text?: string;
  url?: string;
}

export interface ParseResponse {
  content: string;
  source: 'text' | 'file' | 'url';
  filename?: string;
}

export interface GenerateRequest {
  content: string;
  team_config: TeamConfig;
  project_name?: string;
  project_type?: string;
}

export interface GenerateResponse {
  issues: GeneratedIssue[];
  total: number;
  model_used: string;
}

export interface CreateIssuesRequest {
  owner: string;
  repo: string;
  issues: GeneratedIssue[];
  github_token: string;
  milestone_name?: string;
}

export interface CreateIssuesResponse {
  created: Array<{ title: string; url: string; number: number }>;
  failed: Array<{ title: string; error: string }>;
  total_created: number;
}

// ─── GitHub OAuth ────────────────────────────────────────────────────────────

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  email: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  owner: { login: string };
}
