'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// ── Password strength (mirrors register/reset-password pages) ────────────────
const PWD_MIN = 8;
const PWD_MAX = 12;
const evaluatePassword = (pwd) => {
  if (!pwd || pwd.length < PWD_MIN) return 0;
  let score = 0;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};
const STRENGTH_LABELS = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'];
const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-amber-400', 'bg-amber-500', 'bg-emerald-500'];
const STRENGTH_TEXT   = ['', 'text-red-500', 'text-amber-600', 'text-amber-600', 'text-emerald-600'];

function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const score    = evaluatePassword(password);
  const tooShort = password.length < 8;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${!tooShort && score >= s ? STRENGTH_COLORS[score] : 'bg-NFS-border'}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${tooShort ? 'text-red-500' : STRENGTH_TEXT[score]}`}>
        {tooShort ? 'Minimum 8 caractères requis' : STRENGTH_LABELS[score]}
      </p>
    </div>
  );
}

const inputClass = (hasErr) => [
  'w-full rounded-xl px-3.5 py-2.5 text-sm bg-white text-NFS-text placeholder-NFS-muted pr-10',
  'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0',
  hasErr ? 'border border-red-400 focus:ring-red-400' : 'border border-NFS-border hover:border-NFS-primary/50 focus:ring-NFS-primary',
].join(' ');

const validatePwd = (v) => {
  if (!v) return 'Mot de passe requis.';
  if (v.length < PWD_MIN) return `Minimum ${PWD_MIN} caractères.`;
  if (v.length > PWD_MAX) return `Maximum ${PWD_MAX} caractères.`;
  if (!/[A-Z]/.test(v)) return 'Au moins une lettre majuscule requise.';
  if (!/[a-z]/.test(v)) return 'Au moins une lettre minuscule requise.';
  if (!/[0-9]/.test(v)) return 'Au moins un chiffre requis.';
  if (!/[^A-Za-z0-9]/.test(v)) return 'Au moins un caractère spécial requis (!@#$%...).';
  return '';
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isAuthenticated, ready, login, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword]               = useState('');
  const [confirm, setConfirm]                 = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showPwd, setShowPwd]                 = useState(false);
  const [showConf, setShowConf]               = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [currentError, setCurrentError]       = useState('');
  const [pwdError, setPwdError]               = useState('');
  const [confError, setConfError]             = useState('');

  useEffect(() => {
    if (ready && !isAuthenticated) router.replace('/login');
  }, [ready, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ce0 = !currentPassword ? 'Mot de passe actuel requis.' : '';
    const pe  = validatePwd(password);
    const ce  = password !== confirm ? 'Les mots de passe ne correspondent pas.' : '';
    setCurrentError(ce0); setPwdError(pe); setConfError(ce);
    if (ce0 || pe || ce) return;

    setLoading(true);
    try {
      await authAPI.changePassword(currentPassword, password);
      toast.success('Mot de passe mis à jour avec succès !');
      await login(); // ré-hydrate la session (mustChangePassword=false) → redirige vers /dashboard
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!ready || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-NFS-bg flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-NFS-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-NFS-bg relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.08]" aria-hidden="true">
        <Image src="/logo.png" alt="" width={640} height={640} className="h-auto w-[320px] sm:w-[430px] lg:w-[640px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 border border-amber-200 mx-auto mb-4">
            <KeyRound size={26} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-NFS-dark">Changement de mot de passe requis</h1>
          <p className="text-sm text-NFS-muted mt-1 leading-relaxed">
            Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant de continuer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-5 shadow-lg shadow-NFS-dark/8 border border-NFS-border">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-NFS-dark">Mot de passe actuel (reçu par email)</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setCurrentError(''); }}
                autoFocus
                autoComplete="current-password"
                className={inputClass(!!currentError)}
              />
              <button type="button" onClick={() => setShowCurrent((v) => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-NFS-muted hover:text-NFS-dark">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {currentError && <p className="text-xs text-red-500">⚠ {currentError}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-NFS-dark">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPwdError(''); }}
                autoComplete="new-password"
                className={inputClass(!!pwdError)}
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-NFS-muted hover:text-NFS-dark">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrengthBar password={password} />
            {pwdError && <p className="text-xs text-red-500">⚠ {pwdError}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-NFS-dark">Confirmer le mot de passe</label>
            <div className="relative">
              <input
                type={showConf ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setConfError(''); }}
                autoComplete="new-password"
                className={inputClass(!!confError)}
              />
              <button type="button" onClick={() => setShowConf((v) => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-NFS-muted hover:text-NFS-dark">
                {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confError && <p className="text-xs text-red-500">⚠ {confError}</p>}
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Mettre à jour mon mot de passe
          </Button>

          <button type="button" onClick={logout} className="w-full text-center text-xs text-NFS-muted hover:text-NFS-dark transition-colors">
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
