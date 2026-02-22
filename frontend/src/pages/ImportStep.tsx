import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Link, ArrowRight, AlertCircle, Loader2, FileUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../../stores/app.store';
import { parseText, parseFile, parseUrl } from '../../services/api';

type ImportMode = 'text' | 'file' | 'url';

export function ImportStep() {
  const { setParsed, setStep, user } = useAppStore();
  const [mode, setMode] = useState<ImportMode>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    // Fix 6: check user before upload
    if (!user) {
      toast.error('Connecte-toi avec GitHub d\'abord');
      return;
    }
    setLoading(true);
    try {
      const result = await parseFile(file);
      setParsed(result);
      toast.success(`"${file.name}" importé — ${result.char_count.toLocaleString()} caractères`);
      setStep('config');
    } catch {
      toast.error('Erreur lors du parsing du fichier');
    } finally {
      setLoading(false);
    }
  }, [setParsed, setStep, user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/markdown': ['.md'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: loading,
  });

  async function handleSubmit() {
    // Fix 2: early returns before setLoading → moved checks inside try, setLoading always reset in finally
    if (!user) {
      toast.error('Connecte-toi avec GitHub d\'abord');
      return;
    }
    if (mode === 'text' && !text.trim()) {
      toast.error('Colle du contenu dans la zone de texte');
      return;
    }
    if (mode === 'url' && !url.trim()) {
      toast.error('Entre une URL valide');
      return;
    }
    setLoading(true);
    try {
      let result;
      if (mode === 'text') {
        result = await parseText(text);
      } else if (mode === 'url') {
        result = await parseUrl(url);
      }
      if (result) {
        setParsed(result);
        toast.success(`Contenu importé — ${result.char_count.toLocaleString()} caractères`);
        setStep('config');
      }
    } catch {
      toast.error('Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-100 mb-3">
          GDD <span className="text-brand-500">→</span> GitHub Issues
        </h1>
        <p className="text-slate-400 text-lg">
          Importe ton cahier des charges. L'IA fait le reste.
        </p>
      </div>

      {!user && (
        <div className="card p-4 mb-6 flex items-center gap-3 border-amber-500/30 bg-amber-500/5">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            Connecte-toi avec GitHub pour commencer.
          </p>
          <a href="/api/auth/github" className="btn-primary ml-auto text-xs py-1">
            Se connecter
          </a>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-surface-800/60 rounded-xl border border-white/10 mb-6">
        {([
          { id: 'text', label: 'Texte brut', icon: <FileText size={14} /> },
          { id: 'file', label: 'Fichier',    icon: <FileUp size={14} /> },
          { id: 'url',  label: 'URL',         icon: <Link size={14} /> },
        ] as { id: ImportMode; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
              ${mode === tab.id ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card p-6">
        {mode === 'text' && (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Colle ici ton GDD, cahier des charges, ou specs techniques...

Exemple :
# Brainrot Toys Factory - GDD
## Fonctionnalité : Système de tapis roulants
Les joueurs doivent pouvoir placer des tapis roulants pour acheminer..."
            className="input min-h-[280px] resize-y font-mono text-xs leading-relaxed"
          />
        )}

        {mode === 'file' && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
              ${isDragActive ? 'border-brand-500 bg-brand-500/5' : 'border-white/10 hover:border-white/20'}`}
          >
            <input {...getInputProps()} />
            <Upload size={32} className="text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 font-medium mb-1">
              {isDragActive ? 'Dépose ton fichier ici' : 'Glisse-dépose ton fichier'}
            </p>
            <p className="text-slate-500 text-sm">PDF, Markdown, DOCX, TXT · max 20MB</p>
          </div>
        )}

        {mode === 'url' && (
          <div className="space-y-4">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.notion.so/mon-gdd ou https://docs.google.com/document/d/..."
              className="input"
              type="url"
            />
            <p className="text-xs text-slate-500">
              Fonctionne avec les pages Notion publiques et les Google Docs avec accès "Tout le monde avec le lien".
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      {mode !== 'file' && (
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            disabled={loading || !user}
            className="btn-primary"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {loading ? 'Import en cours...' : 'Continuer'}
          </button>
        </div>
      )}
    </div>
  );
}