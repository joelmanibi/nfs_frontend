'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthVisualPanel from '@/components/auth/AuthVisualPanel';
import Button from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

// ── Password strength ──────────────────────────────────────────────────────────
const evaluatePassword = (pwd) => {
  if (!pwd || pwd.length < 8) return 0;
  let score = 0;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};
const STRENGTH_LABELS = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'];
const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-600'];
const STRENGTH_TEXT   = ['', 'text-red-500', 'text-amber-600', 'text-emerald-600', 'text-emerald-700'];

function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const score    = evaluatePassword(password);
  const tooShort = password.length < 8;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1,2,3,4].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${!tooShort && score >= s ? STRENGTH_COLORS[score] : 'bg-nfs-border'}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${tooShort ? 'text-red-500' : STRENGTH_TEXT[score]}`}>
        {tooShort ? 'Minimum 8 caractères requis' : STRENGTH_LABELS[score]}
      </p>
    </div>
  );
}

function ResetPasswordContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const email        = searchParams.get('email') || '';
  const token        = searchParams.get('token') || '';

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [pwdError, setPwdError]     = useState('');
  const [confError, setConfError]   = useState('');
  const [done, setDone]             = useState(false);

  const inputClass = (hasErr) => [
    'w-full rounded-xl px-3.5 py-2.5 text-sm bg-white text-nfs-text placeholder-nfs-muted pr-10',
    'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0',
    hasErr ? 'border border-red-400 focus:ring-red-400' : 'border border-nfs-border hover:border-nfs-primary/50 focus:ring-nfs-primary',
  ].join(' ');

  const validatePwd = (v) => {
    if (!v) return 'Mot de passe requis.';
    if (v.length < 8) return 'Minimum 8 caractères.';
    if (evaluatePassword(v) < 2) return 'Mot de passe trop faible.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pe = validatePwd(password);
    const ce = password !== confirm ? 'Les mots de passe ne correspondent pas.' : '';
    setPwdError(pe); setConfError(ce);
    if (pe || ce) return;
    if (!token || !email) { toast.error('Lien invalide ou incomplet.'); return; }

    setLoading(true);
    try {
      await authAPI.resetPassword(email, token, password);
      setDone(true);
      toast.success('Mot de passe réinitialisé avec succès !');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthVisualPanel
        title={<>Nouveau<br />mot de passe</>}
        description="Choisissez un mot de passe fort pour sécuriser votre compte NFS."
        features={['8 caractères minimum', 'Majuscules + chiffres recommandés', 'Caractères spéciaux acceptés']}
      />

      <div className="relative flex-1 flex items-center justify-center overflow-hidden px-6 py-12 bg-nfs-bg">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.08]" aria-hidden="true">
          <Image src="/logo.png" alt="" width={640} height={640} className="h-auto w-[320px] sm:w-[430px] lg:w-[640px]" />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-nfs-muted hover:text-nfs-dark mb-6 transition-colors">
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-nfs-dark">Nouveau mot de passe</h1>
            <p className="text-sm text-nfs-muted mt-1">Définissez un mot de passe fort pour votre compte</p>
          </div>

          {done ? (
            <div className="bg-white rounded-2xl p-6 shadow-lg shadow-nfs-dark/8 border border-nfs-border text-center space-y-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 mx-auto">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-nfs-dark">Mot de passe mis à jour !</p>
                <p className="text-sm text-nfs-muted mt-1 leading-relaxed">
                  Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
              </div>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-nfs-primary hover:text-nfs-dark font-medium transition-colors">
                <ArrowLeft size={14} /> Aller à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-5 shadow-lg shadow-nfs-dark/8 border border-nfs-border">
              {(!token || !email) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Lien invalide ou incomplet. Veuillez redemander un email de réinitialisation.
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-nfs-dark">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPwdError(''); }}
                    autoFocus
                    autoComplete="new-password"
                    className={inputClass(!!pwdError)}
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nfs-muted hover:text-nfs-dark">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthBar password={password} />
                {pwdError && <p className="text-xs text-red-500">⚠ {pwdError}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-nfs-dark">Confirmer le mot de passe</label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nfs-muted hover:text-nfs-dark">
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confError && <p className="text-xs text-red-500">⚠ {confError}</p>}
              </div>

              <Button type="submit" loading={loading} disabled={!token || !email} className="w-full" size="lg">
                Réinitialiser le mot de passe
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-nfs-bg flex items-center justify-center text-nfs-muted">Chargement...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

