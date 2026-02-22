export type Priority = 'haute' | 'moyenne' | 'basse';
export type MemberRole = 'scripter' | 'builder' | 'ui_designer' | '3d_artist' | 'game_designer' | 'sound_designer';

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

export interface ParsedContent {
  content: string;
  source: 'text' | 'file' | 'url';
  filename?: string;
  char_count: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  owner: string;
}

export interface AuthUser {
  login: string;
  name: string;
  avatar_url: string;
  token: string;
}

export type AppStep = 'import' | 'config' | 'review' | 'results';

export interface CreatedIssue {
  title: string;
  url: string;
  number: number;
}
