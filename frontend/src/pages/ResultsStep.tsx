import { CheckCircle, XCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../stores/app.store';

export function ResultsStep() {
  const { createdIssues, failedIssues, selectedRepo, reset } = useAppStore();

  return (
    <div className="max-w-3xl mx-auto animate-slide-up space-y-6">
      {/* Hero */}
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold text-slate-100 mb-2">
          {createdIssues.length} issues créées !
        </h2>
        <p className="text-slate-400">
          Sur <span className="text-brand-400">{selectedRepo?.full_name}</span>
        </p>
      </div>

      {/* Created */}
      {createdIssues.length > 0 && (
        <div className="card p-6 space-y-3">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400" />
            Issues créées ({createdIssues.length})
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {createdIssues.map((issue, idx) => (
              <a
                key={idx}
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg hover:bg-surface-700 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-slate-500 font-mono shrink-0">#{issue.number}</span>
                  <span className="text-sm text-slate-300 truncate">{issue.title}</span>
                </div>
                <ExternalLink size={12} className="text-slate-600 group-hover:text-brand-400 shrink-0 ml-2 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Failed */}
      {failedIssues.length > 0 && (
        <div className="card p-6 space-y-3 border-red-500/20">
          <h3 className="font-semibold text-red-300 flex items-center gap-2">
            <XCircle size={16} className="text-red-400" />
            Échecs ({failedIssues.length})
          </h3>
          <div className="space-y-2">
            {failedIssues.map((issue, idx) => (
              <div key={idx} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-300 font-medium">{issue.title}</p>
                <p className="text-xs text-red-400/70 mt-0.5">{issue.error}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repo link */}
      {selectedRepo && (
        <a
          href={`https://github.com/${selectedRepo.full_name}/issues`}
          target="_blank"
          rel="noopener noreferrer"
          className="card p-4 flex items-center justify-between hover:border-white/20 transition-all group"
        >
          <span className="text-sm text-slate-300">Voir toutes les issues sur GitHub</span>
          <ExternalLink size={14} className="text-slate-500 group-hover:text-brand-400 transition-colors" />
        </a>
      )}

      {/* Reset */}
      <div className="flex justify-center">
        <button onClick={reset} className="btn-ghost">
          <RefreshCw size={16} /> Nouveau projet
        </button>
      </div>
    </div>
  );
}
