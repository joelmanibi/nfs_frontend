'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, ArrowRight, UserX, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthVisualPanel from '@/components/auth/AuthVisualPanel';
import Button from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Tabs: 'otp' | 'password'
  const [tab, setTab]               = useState('otp');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [notRegistered, setNotRegistered] = useState(false);

  const resetState = () => { setError(''); setNotRegistered(false); };

  // ── OTP flow ──────────────────────────────────────────────────────────────
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    resetState();
    if (!email.trim()) { setError('Veuillez entrer votre email.'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.requestOTP(email.trim().toLowerCase());
      if (data.registered === false) { setNotRegistered(true); return; }
      toast.success('Un code OTP a été envoyé à votre adresse email.');
      router.push(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Password flow ─────────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    resetState();
    if (!email.trim()) { setError('Veuillez entrer votre email.'); return; }
    if (!password.trim()) { setError('Veuillez entrer votre mot de passe.'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.loginWithPassword(email.trim().toLowerCase(), password);
      if (data.registered === false) { setNotRegistered(true); return; }
      if (data.otpOnly) {
        setError('Ce compte utilise uniquement la connexion OTP. Veuillez utiliser cet onglet.');
        setTab('otp');
        return;
      }
      toast.success('Authentification réussie !');
      login(data.token, data.user);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasErr) => [
    'w-full rounded-xl px-3.5 py-2.5 text-sm bg-white text-nfs-text placeholder-nfs-muted',
    'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0',
    hasErr
      ? 'border border-red-400 focus:ring-red-400'
      : 'border border-nfs-border hover:border-nfs-primary/50 focus:ring-nfs-primary',
  ].join(' ');

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthVisualPanel
        title={<>Transfert de fichiers<br />sécurisé et chiffré</>}
        description="Envoyez et recevez vos fichiers en toute confiance grâce au chiffrement AES-256 de bout en bout."
        features={['Chiffrement AES-256', 'Authentification OTP', 'Protection par code']}
      />

      <div className="relative flex-1 flex items-center justify-center overflow-hidden px-6 py-12 bg-nfs-bg">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.08]" aria-hidden="true">
          <Image src="/logo.png" alt="" width={640} height={640} className="h-auto w-[320px] sm:w-[430px] lg:w-[640px]" />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-nfs-dark">Connexion</h1>
            <p className="text-sm text-nfs-muted mt-1">Choisissez votre méthode d&apos;authentification</p>
          </div>

          {/* ── Tabs ── */}
          <div className="flex rounded-xl border border-nfs-border bg-white overflow-hidden mb-4 shadow-sm">
            <button
              type="button"
              onClick={() => { setTab('otp'); resetState(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                tab === 'otp'
                  ? 'bg-nfs-primary text-white'
                  : 'text-nfs-muted hover:text-nfs-dark'
              }`}
            >
              <Mail size={15} /> Code OTP
            </button>
            <button
              type="button"
              onClick={() => { setTab('password'); resetState(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                tab === 'password'
                  ? 'bg-nfs-primary text-white'
                  : 'text-nfs-muted hover:text-nfs-dark'
              }`}
            >
              <KeyRound size={15} /> Mot de passe
            </button>
          </div>

          {/* ── OTP Form ── */}
          {tab === 'otp' && (
            <form onSubmit={handleOTPSubmit} className="bg-white rounded-2xl p-6 space-y-5 shadow-lg shadow-nfs-dark/8 border border-nfs-border">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-nfs-dark">Adresse email</label>
                <input
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); resetState(); }}
                  autoFocus
                  autoComplete="email"
                  className={inputClass(!!error && !notRegistered)}
                />
                {error && !notRegistered && <p className="text-xs text-red-500">⚠ {error}</p>}
              </div>

              {notRegistered && (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <UserX size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-700">Aucun compte trouvé</p>
                      <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                        L&apos;adresse <span className="font-semibold">{email.trim().toLowerCase()}</span> n&apos;est associée à aucun compte.
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/register?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 transition-colors"
                  >
                    Créer un compte <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              {!notRegistered && (
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Envoyer le code OTP <ArrowRight size={16} />
                </Button>
              )}
            </form>
          )}

          {/* ── Password Form ── */}
          {tab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl p-6 space-y-5 shadow-lg shadow-nfs-dark/8 border border-nfs-border">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-nfs-dark">Adresse email</label>
                <input
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); resetState(); }}
                  autoFocus
                  autoComplete="email"
                  className={inputClass(!!error && !notRegistered)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-nfs-dark">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); resetState(); }}
                    autoComplete="current-password"
                    className={inputClass(!!error) + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nfs-muted hover:text-nfs-dark"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error && <p className="text-xs text-red-500">⚠ {error}</p>}
              </div>

              <div className="flex items-center justify-between">
                <span />
                <Link href="/forgot-password" className="text-xs text-nfs-primary hover:text-nfs-dark transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>

              {notRegistered && (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <UserX size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-amber-700">Aucun compte associé à cet email.</p>
                  </div>
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Se connecter <ArrowRight size={16} />
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-nfs-muted mt-5">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-nfs-primary hover:text-nfs-dark font-medium transition-colors">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

