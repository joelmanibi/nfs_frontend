'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

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
};

const INITIAL = { firstName: '', lastName: '', email: '', phone: '', city: '' };

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

  const [form, setForm] = useState({ ...INITIAL, email: prefillEmail });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
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

    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      city: true
    });

    const errs = validateAll();

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

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
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12" style={{background:'linear-gradient(145deg, #005AA1 0%, #00ABDF 100%)'}}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-wide">NFS</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Rejoignez la<br />plateforme NFS
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Créez votre compte et commencez à transférer vos fichiers en toute sécurité dès aujourd&apos;hui.
          </p>
        </div>
        <p className="text-white/40 text-xs">© {new Date().getFullYear()} NFS — Tous droits réservés</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-nfs-bg overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-6 lg:hidden">
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