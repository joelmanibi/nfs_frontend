'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, ArrowRight, CheckCircle2, Info, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthVisualPanel from '@/components/auth/AuthVisualPanel';
import Button from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

// ── Password strength ─────────────────────────────────────────────────────────
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
  const score = evaluatePassword(password);
  if (!password) return null;
  const tooShort = password.length < 8;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              !tooShort && score >= s ? STRENGTH_COLORS[score] : 'bg-nfs-border'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${tooShort ? 'text-red-500' : STRENGTH_TEXT[score]}`}>
        {tooShort ? 'Minimum 8 caractères requis' : STRENGTH_LABELS[score]}
      </p>
    </div>
  );
}

const RULES = {
  firstName: (v) => (!v.trim() ? 'Prénom requis.' : v.trim().length < 2 ? 'Au moins 2 caractères.' : ''),
  lastName:  (v) => (!v.trim() ? 'Nom requis.'    : v.trim().length < 2 ? 'Au moins 2 caractères.' : ''),
  email:     (v) => {
    if (!v.trim()) return 'Email requis.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Format email invalide.';
    return '';
  },
  phone: (v) => {
    if (!v.trim()) return '';
    if (!/^[+\d][\d\s\-().]{5,19}$/.test(v.trim())) return 'Format invalide.';
    return '';
  },
  city: (v) => {
    if (!v.trim()) return '';
    if (v.trim().length < 2) return 'Au moins 2 caractères.';
    return '';
  },
  password: (v) => {
    if (!v) return ''; // optionnel
    if (v.length < 8) return 'Minimum 8 caractères.';
    if (evaluatePassword(v) < 2) return 'Mot de passe trop faible. Ajoutez majuscules, chiffres ou caractères spéciaux.';
    return '';
  },
  confirmPassword: (v, form) => {
    if (!form?.password) return '';
    if (v !== form.password) return 'Les mots de passe ne correspondent pas.';
    return '';
  },
};

const INITIAL = { firstName: '', lastName: '', email: '', phone: '', city: '', password: '', confirmPassword: '' };

function Field({ label, required, error, valid, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-nfs-dark">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {!required && <span className="text-nfs-muted text-xs ml-1">(optionnel)</span>}
        </label>
        {valid && <CheckCircle2 size={13} className="text-nfs-primary" />}
      </div>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>
      )}
    </div>
  );
}

function inputClass(error, valid) {
  return [
    'w-full rounded-xl px-3.5 py-2.5 text-sm bg-white text-nfs-text placeholder-nfs-muted',
    'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0',
    error ? 'border border-red-400 focus:ring-red-400'
      : valid ? 'border border-nfs-primary focus:ring-nfs-primary'
      : 'border border-nfs-border hover:border-nfs-primary/50 focus:ring-nfs-primary',
  ].join(' ');
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';

  const [form, setForm]     = useState({ ...INITIAL, email: prefillEmail });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
    if (touched[key]) {
      setErrors((err) => ({ ...err, [key]: RULES[key](val, key === 'confirmPassword' ? { ...form, [key]: val } : undefined) }));
    }
  };

  const blur = (key) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors((err) => ({ ...err, [key]: RULES[key](form[key], key === 'confirmPassword' ? form : undefined) }));
  };

  const isValid = useCallback(
    (key) => {
      const val = form[key];
      if (!val || !touched[key]) return false;
      return !RULES[key](val, key === 'confirmPassword' ? form : undefined);
    },
    [touched, form],
  );

  const validateAll = () => {
    const e = {};
    Object.keys(RULES).forEach((k) => {
      const msg = RULES[k](form[k], k === 'confirmPassword' ? form : undefined);
      if (msg) e[k] = msg;
    });
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const touchAll = {};
    Object.keys(RULES).forEach((k) => { touchAll[k] = true; });
    setTouched(touchAll);

    const errs = validateAll();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setErrors({});
    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName:  form.lastName,
        email:     form.email,
        phone:     form.phone,
        city:      form.city,
      };
      if (form.password) payload.password = form.password;

      await authAPI.register(payload);
      toast.success('Compte créé ! Connectez-vous avec votre email.');
      router.push('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthVisualPanel
        title={<>Rejoignez la<br />plateforme NFS</>}
        description="Créez votre compte et commencez à transférer vos fichiers en toute sécurité dès aujourd&apos;hui."
        features={['Création rapide', 'Connexion OTP', 'Protection de vos transferts']}
      />

      {/* Right form panel */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden px-6 py-10 bg-nfs-bg overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.08]" aria-hidden="true">
          <Image
            src="/logo.png"
            alt=""
            width={640}
            height={640}
            className="h-auto w-[320px] sm:w-[430px] lg:w-[640px]"
          />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo */}
          <div className="hidden items-center gap-2.5 mb-6 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-nfs-primary">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="text-nfs-dark font-bold text-lg">NFS</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-nfs-dark">Créer un compte</h1>
            <p className="text-sm text-nfs-muted mt-1">Transfert de fichiers sécurisé</p>
          </div>

          <div className="flex items-start gap-2.5 bg-nfs-100 border border-nfs-border rounded-xl px-4 py-3 mb-5">
            <Info size={15} className="text-nfs-primary mt-0.5 shrink-0" />
            <p className="text-xs text-nfs-dark leading-relaxed">
              Les comptes créés ici ont le rôle <strong>Utilisateur</strong>.
              Les comptes <strong>Administrateur</strong> sont provisionnés directement par l&apos;équipe technique.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-2xl p-6 space-y-4 shadow-lg shadow-nfs-dark/8 border border-nfs-border"
          >

          <div className="grid grid-cols-2 gap-3">

            <Field label="Prénom" required error={errors.firstName} valid={isValid('firstName')}>
              <input
                type="text"
                placeholder="Jean"
                value={form.firstName}
                maxLength={50}
                onChange={set('firstName')}
                onBlur={blur('firstName')}
                className={inputClass(errors.firstName, isValid('firstName'))}
              />
            </Field>

            <Field label="Nom" required error={errors.lastName} valid={isValid('lastName')}>
              <input
                type="text"
                placeholder="Dupont"
                value={form.lastName}
                maxLength={50}
                onChange={set('lastName')}
                onBlur={blur('lastName')}
                className={inputClass(errors.lastName, isValid('lastName'))}
              />
            </Field>

          </div>

          <Field label="Email" required error={errors.email} valid={isValid('email')}>
            <input
              type="email"
              placeholder="jean@exemple.com"
              value={form.email}
              onChange={set('email')}
              onBlur={blur('email')}
              autoComplete="email"
              className={inputClass(errors.email, isValid('email'))}
            />
          </Field>

          <Field label="Téléphone" error={errors.phone} valid={isValid('phone')}>
            <input
              type="tel"
              placeholder="+33 6 00 00 00 00"
              value={form.phone}
              maxLength={20}
              onChange={set('phone')}
              onBlur={blur('phone')}
              className={inputClass(errors.phone, isValid('phone'))}
            />
          </Field>

          <Field label="Ville" error={errors.city} valid={isValid('city')}>
            <input
              type="text"
              placeholder="Paris"
              value={form.city}
              maxLength={100}
              onChange={set('city')}
              onBlur={blur('city')}
              className={inputClass(errors.city, isValid('city'))}
            />
          </Field>

          {/* ── Password (optionnel) ── */}
          <div className="border-t border-nfs-border pt-4 space-y-4">
            <p className="text-xs text-nfs-muted leading-relaxed">
              <span className="font-medium text-nfs-dark">Mot de passe</span> (optionnel) — si vous en définissez un, vous pourrez vous connecter avec email + mot de passe en plus de la méthode OTP.
            </p>

            <Field label="Mot de passe" error={errors.password} valid={isValid('password')}>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  onBlur={blur('password')}
                  autoComplete="new-password"
                  className={inputClass(errors.password, isValid('password')) + ' pr-10'}
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nfs-muted hover:text-nfs-dark">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrengthBar password={form.password} />
            </Field>

            {form.password && (
              <Field label="Confirmer le mot de passe" error={errors.confirmPassword} valid={isValid('confirmPassword')}>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    onBlur={blur('confirmPassword')}
                    autoComplete="new-password"
                    className={inputClass(errors.confirmPassword, isValid('confirmPassword')) + ' pr-10'}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nfs-muted hover:text-nfs-dark">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
            )}
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full mt-1"
            size="lg"
          >
            Créer mon compte <ArrowRight size={16} />
          </Button>

        </form>

          <p className="text-center text-sm text-nfs-muted mt-5">
            Déjà un compte ?{' '}
            <Link
              href="/login"
              className="text-nfs-primary hover:text-nfs-dark font-medium transition-colors"
            >
              Se connecter
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-nfs-bg flex items-center justify-center text-nfs-muted">Chargement...</div>}>
      <RegisterContent />
    </Suspense>
  );
}