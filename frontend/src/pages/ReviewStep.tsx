import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, Trash2, ChevronDown, ChevronUp,
  Plus, X, Loader2, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../../stores/app.store';
import { createIssues } from '../../services/api';
import { GeneratedIssue, Priority } from '../../types';

const PRIORITY_STYLES: Record<Priority, string> = {
  haute:   'bg-red-500/20 text-red-300 border-red-500/30',
  moyenne: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  basse:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const LABEL_COLORS: Record<string, string> = {
  scripting:     'bg-blue-500/20 text-blue-300',
  building:      'bg-green-500/20 text-green-300',
  'ui-design':   'bg-pink-500/20 text-pink-300',
  '3d-art':      'bg-yellow-500/20 text-yellow-300',
  'game-design': 'bg-cyan-500/20 text-cyan-300',
  feature:       'bg-blue-500/20 text-blue-300',
  bug:           'bg-red-500/20 text-red-300',
  enhancement:   'bg-purple-500/20 text-purple-300',
  documentation: 'bg-slate-500/20 text-slate-300',
  'sound-design':'bg-orange-500/20 text-orange-300',
};

function IssueCard({ issue, onUpdate, onRemove }: {
  issue: GeneratedIssue;
  onUpdate: (changes: Partial<GeneratedIssue>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  return (
    <div className="card p-4 transition-all hover:border-white/20">
      <div className="flex items-start gap-3">
        {/* Priority dot */}
        <div className={`mt-1 w-2 h-2 rounded-full shrink-0
          ${issue.priority === 'haute' ? 'bg-red-400' : issue.priority === 'moyenne' ? 'bg-amber-400' : 'bg-emerald-400'}`}
        />

        <div className="flex-1 min-w-0">
          {/* Title */}
          {editingTitle ? (
            <input
              autoFocus
              value={issue.title}
              onChange={e => onUpdate({ title: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
              className="input text-sm font-medium mb-2 w-full"
            />
          ) : (
            <h3
              onClick={() => setEditingTitle(true)}
              className="font-medium text-slate-200 text-sm mb-2 cursor-text hover:text-white truncate"
            >
              {issue.title}
            </h3>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`badge border ${PRIORITY_STYLES[issue.priority]} text-xs`}>
              {issue.priority}
            </span>
            {issue.labels.map(label => (
              <span key={label} className={`badge text-xs ${LABEL_COLORS[label] || 'bg-slate-500/20 text-slate-300'}`}>
                {label}
                <button onClick={() => onUpdate({ labels: issue.labels.filter(l => l !== label) })} className="ml-1 opacity-50 hover:opacity-100">
                  <X size={10} />
                </button>
              </span>
            ))}
            {issue.assignees.map(a => (
              <span key={a} className="badge bg-white/5 text-slate-400 text-xs">@{a}</span>
            ))}
            {issue.estimated_effort && (
              <span className="text-xs text-slate-500">⏱ {issue.estimated_effort}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(!expanded)} className="btn-ghost p-1.5">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onRemove} className="btn-ghost p-1.5 text-slate-600 hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          {/* Body */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Description</label>
            <textarea
              value={issue.body}
              onChange={e => onUpdate({ body: e.target.value })}
              className="input text-xs font-mono min-h-[120px] resize-y"
            />
          </div>

          {/* Acceptance criteria */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Critères d'acceptation</label>
            <div className="space-y-1">
              {issue.acceptance_criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={c}
                    onChange={e => {
                      const updated = [...issue.acceptance_criteria];
                      updated[i] = e.target.value;
                      onUpdate({ acceptance_criteria: updated });
                    }}
                    className="input text-xs flex-1"
                  />
                  <button
                    onClick={() => onUpdate({ acceptance_criteria: issue.acceptance_criteria.filter((_, j) => j !== i) })}
                    className="btn-ghost p-1 text-slate-600 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => onUpdate({ acceptance_criteria: [...issue.acceptance_criteria, ''] })}
                className="btn-ghost text-xs"
              >
                <Plus size={12} /> Ajouter un critère
              </button>
            </div>
          </div>

          {/* Add label */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Ajouter un label</label>
            <div className="flex gap-2">
              <input
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && labelInput.trim()) {
                    onUpdate({ labels: [...issue.labels, labelInput.trim()] });
                    setLabelInput('');
                  }
                }}
                placeholder="feature, bug..."
                className="input text-xs flex-1"
              />
              <button
                onClick={() => {
                  if (labelInput.trim()) {
                    onUpdate({ labels: [...issue.labels, labelInput.trim()] });
                    setLabelInput('');
                  }
                }}
                className="btn-primary px-3"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Priorité</label>
            <div className="flex gap-2">
              {(['haute', 'moyenne', 'basse'] as Priority[]).map(p => (
                <button
                  key={p}
                  onClick={() => onUpdate({ priority: p })}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all
                    ${issue.priority === p ? PRIORITY_STYLES[p] : 'border-white/10 text-slate-500'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReviewStep() {
  const {
    issues, updateIssue, removeIssue, setStep,
    selectedRepo, setResults, isCreating, setIsCreating
  } = useAppStore();

  const [dryRun, setDryRun] = useState(false);

  async function handleCreate() {
    if (!selectedRepo) return toast.error('Aucun repo sélectionné');
    if (issues.length === 0) return toast.error('Aucune issue à créer');
    setIsCreating(true);
    try {
      const result = await createIssues(selectedRepo.owner, selectedRepo.name, issues);
      setResults(result.created, result.failed);
      toast.success(`${result.total_created} issues créées sur GitHub !`);
      setStep('results');
    } catch (err) {
      toast.error('Erreur lors de la création des issues');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-slide-up space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setStep('config')} className="btn-ghost">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-100">Révision des issues</h2>
          <p className="text-sm text-slate-500">{issues.length} issues · {selectedRepo?.full_name}</p>
        </div>
        <div />
      </div>

      {/* Issues list */}
      <div className="space-y-2">
        {issues.length === 0 ? (
          <div className="card p-12 text-center text-slate-500">
            Aucune issue générée. Retourne à l'étape précédente.
          </div>
        ) : issues.map(issue => (
          <IssueCard
            key={issue.id}
            issue={issue}
            onUpdate={changes => updateIssue(issue.id, changes)}
            onRemove={() => removeIssue(issue.id)}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={e => setDryRun(e.target.checked)}
              className="rounded"
            />
            <Eye size={14} /> Dry-run (prévisualisation sans push)
          </label>
        </div>
        <button
          onClick={dryRun ? () => toast('Mode dry-run : aucune issue créée.', { icon: '👁️' }) : handleCreate}
          disabled={isCreating || issues.length === 0}
          className="btn-primary"
        >
          {isCreating
            ? <><Loader2 size={16} className="animate-spin" /> Création...</>
            : <><ArrowRight size={16} /> Créer {issues.length} issues</>}
        </button>
      </div>
    </div>
  );
}
