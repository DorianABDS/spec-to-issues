import { CheckCircle, Github, LogOut, Upload, Settings, Eye, Rocket } from 'lucide-react';
import { useAppStore } from '../../stores/app.store';
import { AppStep } from '../../types';

const STEPS: { id: AppStep; label: string; icon: React.ReactNode }[] = [
  { id: 'import',  label: 'Import',      icon: <Upload size={14} /> },
  { id: 'config',  label: 'Config',      icon: <Settings size={14} /> },
  { id: 'review',  label: 'Révision',    icon: <Eye size={14} /> },
  { id: 'results', label: 'Résultats',   icon: <Rocket size={14} /> },
];

const STEP_ORDER: AppStep[] = ['import', 'config', 'review', 'results'];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, setUser, step, issues } = useAppStore();

  const currentIdx = STEP_ORDER.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-surface-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Github size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-slate-100">GDD → Issues</span>
            <span className="text-slate-600 text-xs hidden sm:block">Workers Studio</span>
          </div>

          {/* Stepper */}
          <nav className="hidden md:flex items-center gap-1">
            {STEPS.map((s, idx) => {
              const done = idx < currentIdx;
              const active = idx === currentIdx;
              return (
                <div key={s.id} className="flex items-center gap-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${active ? 'bg-brand-600 text-white' : done ? 'text-brand-400' : 'text-slate-500'}`}
                  >
                    {done ? <CheckCircle size={12} /> : s.icon}
                    {s.label}
                    {s.id === 'review' && issues.length > 0 && (
                      <span className="bg-white/20 px-1.5 rounded-full text-xs">{issues.length}</span>
                    )}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-4 h-px ${idx < currentIdx ? 'bg-brand-600' : 'bg-white/10'}`} />
                  )}
                </div>
              );
            })}
          </nav>

          {/* User */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <img src={user.avatar_url} alt={user.login} className="w-7 h-7 rounded-full border border-white/20" />
                <span className="text-sm text-slate-400 hidden sm:block">@{user.login}</span>
                <button onClick={() => setUser(null)} className="btn-ghost p-1.5 text-slate-500">
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <a href="/api/auth/github" className="btn-primary text-xs py-1.5 px-3">
                <Github size={14} /> Connexion GitHub
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4">
        <p className="text-center text-xs text-slate-600">
          Workers Studio · issues.abbadessa-dorian.fr
        </p>
      </footer>
    </div>
  );
}
