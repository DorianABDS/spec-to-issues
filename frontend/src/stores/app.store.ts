import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AppStep, AuthUser, GeneratedIssue, ParsedContent,
  TeamConfig, GitHubRepo, CreatedIssue
} from '../types';

// ─── Default team config for Workers Studio ───────────────────────────────────
const DEFAULT_TEAM_CONFIG: TeamConfig = {
  members: [
    { name: 'Dorian (Lead)', github_handle: 'ABBADESSA', roles: ['scripter'], active: true },
  ],
  assignment_rules: {
    scripting: ['scripter'],
    building: ['builder'],
    design: ['ui_designer'],
    art: ['3d_artist'],
    game_design: ['game_designer'],
    sound: ['sound_designer'],
  },
};

// ─── App store ────────────────────────────────────────────────────────────────
interface AppState {
  // Navigation
  step: AppStep;
  setStep: (step: AppStep) => void;

  // Auth
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;

  // Parsed content
  parsed: ParsedContent | null;
  setParsed: (parsed: ParsedContent | null) => void;

  // Config
  teamConfig: TeamConfig;
  setTeamConfig: (config: TeamConfig) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  projectType: string;
  setProjectType: (type: string) => void;
  selectedRepo: GitHubRepo | null;
  setSelectedRepo: (repo: GitHubRepo | null) => void;

  // Generated issues
  issues: GeneratedIssue[];
  setIssues: (issues: GeneratedIssue[]) => void;
  updateIssue: (id: string, changes: Partial<GeneratedIssue>) => void;
  removeIssue: (id: string) => void;

  // Results
  createdIssues: CreatedIssue[];
  failedIssues: Array<{ title: string; error: string }>;
  setResults: (created: CreatedIssue[], failed: Array<{ title: string; error: string }>) => void;

  // Loading
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  isCreating: boolean;
  setIsCreating: (v: boolean) => void;

  // Reset
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      step: 'import',
      setStep: (step) => set({ step }),

      user: null,
      setUser: (user) => set({ user }),

      parsed: null,
      setParsed: (parsed) => set({ parsed }),

      teamConfig: DEFAULT_TEAM_CONFIG,
      setTeamConfig: (teamConfig) => set({ teamConfig }),
      projectName: '',
      setProjectName: (projectName) => set({ projectName }),
      projectType: 'Jeu Roblox',
      setProjectType: (projectType) => set({ projectType }),
      selectedRepo: null,
      setSelectedRepo: (selectedRepo) => set({ selectedRepo }),

      issues: [],
      setIssues: (issues) => set({ issues }),
      updateIssue: (id, changes) =>
        set((state) => ({
          issues: state.issues.map((issue) =>
            issue.id === id ? { ...issue, ...changes } : issue
          ),
        })),
      removeIssue: (id) =>
        set((state) => ({ issues: state.issues.filter((i) => i.id !== id) })),

      createdIssues: [],
      failedIssues: [],
      setResults: (createdIssues, failedIssues) => set({ createdIssues, failedIssues }),

      isGenerating: false,
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      isCreating: false,
      setIsCreating: (isCreating) => set({ isCreating }),

      reset: () =>
        set({
          step: 'import',
          parsed: null,
          issues: [],
          createdIssues: [],
          failedIssues: [],
          selectedRepo: null,
          projectName: '',
          isGenerating: false,
          isCreating: false,
        }),
    }),
    {
      name: 'gdd-app-state',
      partialize: (state) => ({
        user: state.user,
        teamConfig: state.teamConfig,
        projectType: state.projectType,
      }),
    }
  )
);
