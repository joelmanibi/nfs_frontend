'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

// ── Validation rules ──────────────────────────────────────────────────────────
const RULES = {
  firstName: (v) => (!v.trim() ? 'Prénom requis.' : v.trim().length < 2 ? 'Au moins 2 caractères.' : ''),
  lastName:  (v) => (!v.trim() ? 'Nom requis.'    : v.trim().length < 2 ? 'Au moins 2 caractères.' : ''),
  email:     (v) => {
    if (!v.trim()) return 'Email requis.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Format email invalide.';
    return '';
  },
  phone: (v) => {
    if (!v.trim()) return ''; // optional
    if (!/^[+\d][\d\s\-().]{5,19}$/.test(v.trim())) return 'Format invalide (ex : +33 6 00 00 00 00).';
    return '';
  },
  city: (v) => {
    if (!v.trim()) return ''; // optional
    if (v.trim().length < 2) return 'Au moins 2 caractères.';
    return '';
  },
};

const INITIAL = { firstName: '', lastName: '', email: '', phone: '', city: '' };

// ── Styled field with valid indicator ─────────────────────────────────────────
function Field({ label, required, error, valid, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
          {!required && <span className="text-slate-600 text-xs ml-1">(optionnel)</span>}
        </label>
        {valid && <CheckCircle2 size={13} className="text-green-400" />}
      </div>
      {children}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">⚠ {error}</p>
      )}
    </div>
  );
}

// ── Shared input class builder ─────────────────────────────────────────────────
function inputClass(error, valid) {
  return [
    'w-full rounded-lg px-3.5 py-2.5 text-sm bg-slate-800 text-slate-100 placeholder-slate-500',
    'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0',
    error ? 'border border-red-500 focus:ring-red-500'
      : valid ? 'border border-green-600 focus:ring-green-500'
      : 'border border-slate-600 hover:border-slate-500 focus:ring-blue-500',
  ].join(' ');
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';

  const [form, setForm]       = useState({ ...INITIAL, email: prefillEmail });
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
    // Live-clear error as user types
    if (touched[key]) {
      setErrors((err) => ({ ...err, [key]: RULES[key](val) }));
    }
  };

  const blur = (key) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors((err) => ({ ...err, [key]: RULES[key](form[key]) }));
  };

  const isValid = useCallback(
    (key) => touched[key] && !RULES[key](form[key]) && form[key].trim() !== '',
    [touched, form],
  );

  const validateAll = () => {
    const e = {};
    Object.keys(RULES).forEach((k) => {
      const msg = RULES[k](form[k]);
      if (msg) e[k] = msg;
    });
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Touch all fields to show errors
    setTouched({ firstName: true, lastName: true, email: true, phone: true, city: true });
    const errs = validateAll();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await authAPI.register(form);
      toast.success('Compte créé ! Connectez-vous avec votre email.');
      router.push('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/50 mb-4">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Créer un compte</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">Transfert de fichiers sécurisé</p>
        </div>

        {/* Info banner — role note */}
        <div className="flex items-start gap-2.5 bg-blue-900/20 border border-blue-800/50 rounded-xl px-4 py-3 mb-5">
          <Info size={15} className="text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-300 leading-relaxed">
            Les comptes créés ici ont le rôle <strong>Utilisateur</strong>.
            Les comptes <strong>Administrateur</strong> sont provisionnés directement par l&apos;équipe technique.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">

          {/* First name + Last name */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" required error={errors.firstName} valid={isValid('firstName')}>
              <input
                type="text" placeholder="Jean" value={form.firstName} maxLength={50}
                onChange={set('firstName')} onBlur={blur('firstName')}
                className={inputClass(errors.firstName, isValid('firstName'))}
              />
            </Field>
            <Field label="Nom" required error={errors.lastName} valid={isValid('lastName')}>
              <input
                type="text" placeholder="Dupont" value={form.lastName} maxLength={50}
                onChange={set('lastName')} onBlur={blur('lastName')}
                className={inputClass(errors.lastName, isValid('lastName'))}
              />
            </Field>
          </div>

          {/* Email */}
          <Field label="Email" required error={errors.email} valid={isValid('email')}>
            <input
              type="email" placeholder="jean@exemple.com" value={form.email}
              onChange={set('email')} onBlur={blur('email')} autoComplete="email"
              className={inputClass(errors.email, isValid('email'))}
            />
          </Field>

          {/* Phone */}
          <Field label="Téléphone" error={errors.phone} valid={isValid('phone')}>
            <input
              type="tel" placeholder="+33 6 00 00 00 00" value={form.phone} maxLength={20}
              onChange={set('phone')} onBlur={blur('phone')}
              className={inputClass(errors.phone, isValid('phone'))}
            />
          </Field>

          {/* City */}
          <Field label="Ville" error={errors.city} valid={isValid('city')}>
            <input
              type="text" placeholder="Paris" value={form.city} maxLength={100}
              onChange={set('city')} onBlur={blur('city')}
              className={inputClass(errors.city, isValid('city'))}
            />
          </Field>

          <Button type="submit" loading={loading} className="w-full mt-1" size="lg">
            Créer mon compte <ArrowRight size={16} />
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

