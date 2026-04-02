'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, UserX, Eye, EyeOff, KeyRound, Mail, Clock, Building2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthVisualPanel from '@/components/auth/AuthVisualPanel';
import Button from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Tabs: 'otp' | 'password' | 'ldap'
  const [tab, setTab]               = useState('otp');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [notRegistered, setNotRegistered] = useState(false);
  const [pending, setPending]       = useState(false);

  // ── LDAP state ────────────────────────────────────────────────────────────
  const [ldapUsername, setLdapUsername] = useState('');
  const [ldapPassword, setLdapPassword] = useState('');
  const [showLdapPwd, setShowLdapPwd]   = useState(false);

  // ── Rate-limit lockout countdown ──────────────────────────────────────────
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const t = setTimeout(() => setLockoutSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockoutSeconds]);

  const formatCountdown = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const handleRateLimit = (err) => {
    const retryAfter = err?.response?.data?.retryAfter;
    setLockoutSeconds(retryAfter && retryAfter > 0 ? retryAfter : 300);
  };

  const resetState = () => { setError(''); setNotRegistered(false); setPending(false); };

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
      if (err?.response?.status === 429) { handleRateLimit(err); return; }
      if (err?.response?.data?.pending) { setPending(true); return; }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── LDAP flow ─────────────────────────────────────────────────────────────
  const handleLDAPSubmit = async (e) => {
    e.preventDefault();
    resetState();
    if (!ldapUsername.trim()) { setError('Veuillez entrer votre identifiant PAA.'); return; }
    if (!ldapPassword.trim()) { setError('Veuillez entrer votre mot de passe Windows.'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.loginWithLDAP(ldapUsername.trim(), ldapPassword);
      toast.success('Authentification PAA réussie !');
      login(data.token, data.user);
    } catch (err) {
      if (err?.response?.status === 429) { handleRateLimit(err); return; }
      if (err?.response?.data?.pending) { setPending(true); return; }
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
      if (err?.response?.status === 429) { handleRateLimit(err); return; }
      if (err?.response?.data?.pending) { setPending(true); return; }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasErr) => [
    'w-full rounded-xl px-3.5 py-2.5 text-sm bg-white text-NFS-text placeholder-NFS-muted',
    'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0',
    hasErr
      ? 'border border-red-400 focus:ring-red-400'
      : 'border border-NFS-border hover:border-NFS-primary/50 focus:ring-NFS-primary',
  ].join(' ');

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthVisualPanel
        title={<>IDS Secure Transport <br /> la solution de partage de fichiers sécurisés du Port Autonome d'Abidjan</>}
        description="IDS Secure Transport est la plateforme officielle de transfert sécurisé du Port Autonome d'Abidjan. Accédez à vos documents en toute confiance, où que vous soyez."
        features={['Accès contrôlé et audité']}
      />

      <div className="relative flex-1 flex items-center justify-center overflow-hidden px-6 py-12 bg-NFS-bg">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.08]" aria-hidden="true">
          <Image src="/logo.png" alt="" width={640} height={640} className="h-auto w-[320px] sm:w-[430px] lg:w-[640px]" />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-6">
            <p className="text-xs font-semibold text-NFS-primary uppercase tracking-widest mb-1">Port Autonome d&apos;Abidjan</p>
            <h1 className="text-2xl font-bold text-NFS-dark">Connexion à la sécurisation des Transferts </h1>
            <p className="text-sm text-NFS-muted mt-1">Choisissez votre méthode d&apos;authentification</p>
          </div>

          {/* ── Lockout countdown banner ── */}
          {lockoutSeconds > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 mb-4">
              <ShieldAlert size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">Accès temporairement bloqué</p>
                <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                  Trop de tentatives échouées. Réessayez dans{' '}
                  <span className="font-bold tabular-nums">{formatCountdown(lockoutSeconds)}</span>.
                </p>
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="flex rounded-xl border border-NFS-border bg-white overflow-hidden mb-4 shadow-sm">
            <button
              type="button"
              onClick={() => { setTab('otp'); resetState(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                tab === 'otp'
                  ? 'bg-NFS-primary text-white'
                  : 'text-NFS-muted hover:text-NFS-dark'
              }`}
            >
              <Mail size={15} /> Code OTP
            </button>
            <button
              type="button"
              onClick={() => { setTab('password'); resetState(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                tab === 'password'
                  ? 'bg-NFS-primary text-white'
                  : 'text-NFS-muted hover:text-NFS-dark'
              }`}
            >
              <KeyRound size={15} /> Mot de passe
            </button>
            <button
              type="button"
              onClick={() => { setTab('ldap'); resetState(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                tab === 'ldap'
                  ? 'bg-NFS-primary text-white'
                  : 'text-NFS-muted hover:text-NFS-dark'
              }`}
            >
              <Building2 size={15} /> LDAP
            </button>
          </div>

          {/* ── OTP Form ── */}
          {tab === 'otp' && (
            <form onSubmit={handleOTPSubmit} className="bg-white rounded-2xl p-6 space-y-5 shadow-lg shadow-NFS-dark/8 border border-NFS-border">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-NFS-dark">Adresse email</label>
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

              {pending && (
                <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
                  <Clock size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-700">Compte en attente de validation</p>
                    <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                      Votre compte est en cours de validation par un administrateur. Vous recevrez un email dès que votre accès sera activé.
                    </p>
                  </div>
                </div>
              )}

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
                <Button type="submit" loading={loading} disabled={lockoutSeconds > 0} className="w-full" size="lg">
                  Envoyer le code OTP <ArrowRight size={16} />
                </Button>
              )}
            </form>
          )}

          {/* ── Password Form ── */}
          {tab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl p-6 space-y-5 shadow-lg shadow-NFS-dark/8 border border-NFS-border">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-NFS-dark">Adresse email</label>
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
                <label className="text-sm font-medium text-NFS-dark">Mot de passe</label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-NFS-muted hover:text-NFS-dark"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error && <p className="text-xs text-red-500">⚠ {error}</p>}
              </div>

              <div className="flex items-center justify-between">
                <span />
                <Link href="/forgot-password" className="text-xs text-NFS-primary hover:text-NFS-dark transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>

              {pending && (
                <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
                  <Clock size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-700">Compte en attente de validation</p>
                    <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                      Votre compte est en cours de validation par un administrateur. Vous recevrez un email dès que votre accès sera activé.
                    </p>
                  </div>
                </div>
              )}

              {notRegistered && (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <UserX size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-amber-700">Aucun compte associé à cet email.</p>
                  </div>
                </div>
              )}

              <Button type="submit" loading={loading} disabled={lockoutSeconds > 0} className="w-full" size="lg">
                Se connecter <ArrowRight size={16} />
              </Button>
            </form>
          )}

          {/* ── LDAP / AD Form ── */}
          {tab === 'ldap' && (
            <form onSubmit={handleLDAPSubmit} className="bg-white rounded-2xl p-6 space-y-5 shadow-lg shadow-NFS-dark/8 border border-NFS-border">
              <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                <Building2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Réservé aux agents du <span className="font-semibold">Port Autonome d&apos;Abidjan</span>. Utilisez vos identifiants Windows (Active Directory).
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-NFS-dark">Identifiant Windows</label>
                <input
                  type="text"
                  placeholder="ex : jdupont"
                  value={ldapUsername}
                  onChange={(e) => { setLdapUsername(e.target.value); resetState(); }}
                  autoFocus
                  autoComplete="username"
                  className={inputClass(!!error)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-NFS-dark">Mot de passe Windows</label>
                <div className="relative">
                  <input
                    type={showLdapPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={ldapPassword}
                    onChange={(e) => { setLdapPassword(e.target.value); resetState(); }}
                    autoComplete="current-password"
                    className={inputClass(!!error) + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLdapPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-NFS-muted hover:text-NFS-dark"
                    tabIndex={-1}
                  >
                    {showLdapPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error && <p className="text-xs text-red-500">⚠ {error}</p>}
              </div>

              {pending && (
                <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
                  <Clock size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-700">Votre compte est en attente de validation par un administrateur.</p>
                </div>
              )}

              <Button type="submit" loading={loading} disabled={lockoutSeconds > 0} className="w-full" size="lg">
                Se connecter <ArrowRight size={16} />
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-NFS-muted mt-5">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-NFS-primary hover:text-NFS-dark font-medium transition-colors">
              Créer un compte
            </Link>
          </p>
          <p className="text-center text-xs text-NFS-muted mt-3">
            <Link href="/faq" className="hover:text-NFS-primary transition-colors underline underline-offset-2">
              Consulter la FAQ
            </Link>
            {' · '}
            <Link href="/register" className="hover:text-NFS-primary transition-colors underline underline-offset-2">
              Conditions d&apos;utilisation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

