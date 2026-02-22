import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '../../stores/app.store';

export function AuthCallback() {
  const navigate = useNavigate();
  const setUser = useAppStore(s => s.setUser);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const login = params.get('login');
    const avatar = params.get('avatar');

    if (token && login) {
      setUser({
        token,
        login,
        name: login,
        avatar_url: avatar ? decodeURIComponent(avatar) : '',
      });
      navigate('/');
    } else {
      navigate('/?error=auth_failed');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 size={32} className="animate-spin text-brand-500 mx-auto" />
        <p className="text-slate-400">Connexion GitHub en cours...</p>
      </div>
    </div>
  );
}
