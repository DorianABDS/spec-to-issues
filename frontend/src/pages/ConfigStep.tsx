import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../../stores/app.store';
import { fetchRepos, generateIssues } from '../../services/api';
import { GitHubRepo, MemberRole, TeamMember } from '../../types';

const ROLES: MemberRole[] = ['scripter', 'builder', 'ui_designer', '3d_artist', 'game_designer', 'sound_designer'];
const ROLE_LABELS: Record<MemberRole, string> = {
  scripter: '💻 Scripter',
  builder: '🏗️ Builder',
  ui_designer: '🎨 UI/UX',
  '3d_artist': '🗿 3D Artist',
  game_designer: '🎮 Game Designer',
  sound_designer: '🔊 Sound Designer',
};

export function ConfigStep() {
  const {
    setStep, user, parsed, teamConfig, setTeamConfig,
    projectName, setProjectName, projectType, setProjectType,
    selectedRepo, setSelectedRepo, setIssues, isGenerating, setIsGenerating
  } = useAppStore();

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [newMember, setNewMember] = useState<Partial<TeamMember>>({ roles: [] });

  useEffect(() => {
    loadRepos();
  }, []);

  async function loadRepos() {
    setLoadingRepos(true);
    try {
      const data = await fetchRepos();
      setRepos(data);
    } catch {
      toast.error('Impossible de charger les repos GitHub');
    } finally {
      setLoadingRepos(false);
    }
  }

  function addMember() {
    if (!newMember.name || !newMember.github_handle) {
      return toast.error('Nom et handle GitHub requis');
    }
    setTeamConfig({
      ...teamConfig,
      members: [...teamConfig.members, {
        name: newMember.name,
        github_handle: newMember.github_handle.replace('@', ''),
        roles: newMember.roles as MemberRole[] || [],
        active: true,
      }],
    });
    setNewMember({ roles: [] });
  }

  function removeMember(idx: number) {
    setTeamConfig({
      ...teamConfig,
      members: teamConfig.members.filter((_, i) => i !== idx),
    });
  }

  function toggleMemberRole(idx: number, role: MemberRole) {
    const updated = teamConfig.members.map((m, i) => {
      if (i !== idx) return m;
      const hasRole = m.roles.includes(role);
      return { ...m, roles: hasRole ? m.roles.filter(r => r !== role) : [...m.roles, role] };
    });
    setTeamConfig({ ...teamConfig, members: updated });
  }

  async function handleGenerate() {
    if (!parsed) return toast.error('Aucun contenu importé');
    if (!selectedRepo) return toast.error('Sélectionne un repository GitHub');
    setIsGenerating(true);
    try {
      const result = await generateIssues(parsed.content, teamConfig, projectName, projectType);
      setIssues(result.issues);
      toast.success(`${result.total} issues générées avec ${result.model_used} !`);
      setStep('review');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de génération';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setStep('import')} className="btn-ghost">
          <ArrowLeft size={16} /> Retour
        </button>
        <h2 className="text-xl font-bold text-slate-100">Configuration</h2>
        <div />
      </div>

      {/* Repo selection */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-200">Repository GitHub</h3>
          <button onClick={loadRepos} disabled={loadingRepos} className="btn-ghost text-xs p-1.5">
            <RefreshCw size={12} className={loadingRepos ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {repos.map(repo => (
            <button
              key={repo.id}
              onClick={() => setSelectedRepo(repo)}
              className={`text-left p-3 rounded-lg border text-sm transition-all
                ${selectedRepo?.id === repo.id
                  ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                  : 'border-white/10 hover:border-white/20 text-slate-300'}`}
            >
              <div className="font-medium truncate">{repo.name}</div>
              <div className="text-xs text-slate-500 truncate">{repo.full_name}</div>
            </button>
          ))}
          {loadingRepos && (
            <div className="col-span-2 flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-slate-500" />
            </div>
          )}
        </div>
      </div>

      {/* Project info */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-200">Projet</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nom du projet</label>
            <input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Brainrot Toys Factory"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <select value={projectType} onChange={e => setProjectType(e.target.value)} className="input">
              <option>Jeu Roblox</option>
              <option>App Web</option>
              <option>Extension Chrome</option>
              <option>Autre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Team config */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-200">Équipe</h3>

        {/* Existing members */}
        <div className="space-y-2">
          {teamConfig.members.map((member, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-surface-700/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-medium text-sm text-slate-200">{member.name}</span>
                  <span className="text-xs text-slate-500">@{member.github_handle}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ROLES.map(role => (
                    <button
                      key={role}
                      onClick={() => toggleMemberRole(idx, role)}
                      className={`badge text-xs transition-all
                        ${member.roles.includes(role)
                          ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                          : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/10'}`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => removeMember(idx)} className="btn-ghost p-1 text-slate-600 hover:text-red-400 shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add member */}
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-slate-500 mb-3">Ajouter un membre</p>
          <div className="flex gap-2 mb-2">
            <input
              value={newMember.name || ''}
              onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
              placeholder="Nom"
              className="input flex-1"
            />
            <input
              value={newMember.github_handle || ''}
              onChange={e => setNewMember(p => ({ ...p, github_handle: e.target.value }))}
              placeholder="@handle"
              className="input w-36"
            />
            <button onClick={addMember} className="btn-primary px-3">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => {
                  const roles = newMember.roles as MemberRole[] || [];
                  const has = roles.includes(role);
                  setNewMember(p => ({ ...p, roles: has ? roles.filter(r => r !== role) : [...roles, role] }));
                }}
                className={`badge text-xs transition-all
                  ${(newMember.roles as MemberRole[])?.includes(role)
                    ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                    : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/10'}`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate CTA */}
      <div className="flex justify-end">
        <button onClick={handleGenerate} disabled={isGenerating || !selectedRepo || !parsed} className="btn-primary">
          {isGenerating
            ? <><Loader2 size={16} className="animate-spin" /> Génération en cours...</>
            : <><ArrowRight size={16} /> Générer les issues</>}
        </button>
      </div>
    </div>
  );
}
