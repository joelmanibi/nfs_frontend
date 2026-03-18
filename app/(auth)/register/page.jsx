'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Info, Eye, EyeOff, Clock, Building2, Globe, Phone, ScrollText, X, ChevronDown } from 'lucide-react';
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
              !tooShort && score >= s ? STRENGTH_COLORS[score] : 'bg-NFS-border'
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
    if (!v.trim()) return 'Téléphone requis.';
    if (!/^[0-9]{6,15}$/.test(v.trim())) return 'Chiffres uniquement, sans préfixe (6–15 chiffres).';
    return '';
  },
  organisation: (v) => (!v.trim() ? 'Organisation requise.' : v.trim().length < 2 ? 'Au moins 2 caractères.' : ''),
  country: (v) => (!v.trim() ? 'Pays requis.' : v.trim().length < 2 ? 'Au moins 2 caractères.' : ''),
  city: (v) => {
    if (!v.trim()) return '';
    if (v.trim().length < 2) return 'Au moins 2 caractères.';
    return '';
  },
  password: (v) => {
    if (!v) return 'Mot de passe requis.';
    if (v.length < 8) return 'Minimum 8 caractères.';
    if (evaluatePassword(v) < 2) return 'Trop faible. Ajoutez majuscules, chiffres ou caractères spéciaux.';
    return '';
  },
  confirmPassword: (v, form) => {
    if (!form?.password) return '';
    if (v !== form.password) return 'Les mots de passe ne correspondent pas.';
    return '';
  },
};

const INITIAL = { firstName: '', lastName: '', email: '', phone: '', organisation: '', country: '', city: '', password: '', confirmPassword: '' };

function Field({ label, required, error, valid, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-NFS-dark">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {!required && <span className="text-NFS-muted text-xs ml-1">(optionnel)</span>}
        </label>
        {valid && <CheckCircle2 size={13} className="text-NFS-primary" />}
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
    'w-full rounded-xl px-3.5 py-2.5 text-sm bg-white text-NFS-text placeholder-NFS-muted',
    'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0',
    error ? 'border border-red-400 focus:ring-red-400'
      : valid ? 'border border-NFS-primary focus:ring-NFS-primary'
      : 'border border-NFS-border hover:border-NFS-primary/50 focus:ring-NFS-primary',
  ].join(' ');
}

// ── Contenu des CGU ──────────────────────────────────────────────────────────
const CGU_SECTIONS = [
  {
    title: '1. Objet du service',
    text: "Le service de transfert sécurisé de fichiers IDS Secure permet aux utilisateurs autorisés d'échanger des fichiers de manière sécurisée via une plateforme informatique dédiée. Le Service est destiné à faciliter les échanges de données entre collaborateurs, partenaires, clients et systèmes informatiques, tout en garantissant un niveau élevé de sécurité, de traçabilité et de confidentialité.",
  },
  {
    title: '2. Acceptation des conditions',
    text: "L'utilisation du Service implique l'acceptation pleine et entière des présentes conditions d'utilisation. En accédant au Service ou en envoyant un fichier via la plateforme, l'utilisateur reconnaît avoir pris connaissance et accepté ces conditions.",
  },
  {
    title: "3. Accès au service",
    text: "L'accès au Service est réservé aux utilisateurs autorisés. Selon la configuration du service, l'accès peut être accordé via un compte utilisateur, via une invitation, ou via un système d'authentification d'entreprise (SSO, Active Directory, LDAP). L'utilisateur est responsable de la confidentialité de ses identifiants d'accès.",
  },
  {
    title: '4. Utilisation autorisée',
    text: "L'utilisateur s'engage à utiliser le Service uniquement dans un cadre professionnel et conforme aux lois et réglementations en vigueur. Il est interdit d'utiliser le Service pour : transmettre des contenus illégaux, diffuser des contenus malveillants, envoyer des virus ou logiciels malveillants, partager des données sans autorisation, ou contourner les mécanismes de sécurité.",
  },
  {
    title: '5. Responsabilité des utilisateurs',
    text: "Chaque utilisateur est responsable des fichiers qu'il transfère, de l'exactitude des destinataires et du respect des règles de confidentialité. L'utilisateur doit vérifier que les destinataires sont autorisés à recevoir les informations envoyées.",
  },
  {
    title: '6. Sécurité des données',
    text: "Le Service met en œuvre plusieurs mécanismes de sécurité, notamment : le chiffrement des communications, le contrôle d'accès, la journalisation des activités et l'analyse antivirus des fichiers. Cependant, l'utilisateur reste responsable de la sensibilité des informations qu'il transmet.",
  },
  {
    title: '7. Confidentialité',
    text: "Les fichiers transférés via la plateforme sont traités de manière confidentielle. L'accès aux fichiers est limité aux utilisateurs autorisés et aux destinataires désignés. Les administrateurs techniques peuvent accéder aux données uniquement dans le cadre de la maintenance ou de la sécurité du système.",
  },
  {
    title: '8. Conservation des fichiers',
    text: "Les fichiers transférés via le Service sont conservés pendant une durée limitée, définie par la politique de gestion des données de l'organisation. À l'issue de cette période, les fichiers sont automatiquement supprimés.",
  },
  {
    title: '9. Limitation de responsabilité',
    text: "L'exploitant du Service ne pourra être tenu responsable d'une erreur de saisie des destinataires, d'une mauvaise utilisation du service, d'une perte de données liée à une mauvaise manipulation, ou d'une indisponibilité temporaire du service.",
  },
  {
    title: "10. Suspension ou suppression d'accès",
    text: "L'accès au Service peut être suspendu ou supprimé en cas de non-respect des présentes conditions, d'usage frauduleux ou abusif, ou de risque pour la sécurité du système.",
  },
  {
    title: '11. Journalisation et audit',
    text: "Toutes les opérations effectuées sur la plateforme peuvent être enregistrées à des fins de sécurité, de conformité et d'audit. Ces journaux peuvent inclure l'identifiant utilisateur, l'adresse IP, la date et l'heure des opérations, ainsi que les actions effectuées.",
  },
  {
    title: '12. Protection des données personnelles',
    text: "Les données personnelles collectées dans le cadre de l'utilisation du Service sont traitées conformément à la réglementation en vigueur relative à la protection des données. Les utilisateurs disposent d'un droit d'accès, de rectification et de suppression de leurs données.",
  },
  {
    title: '13. Disponibilité du service',
    text: "L'exploitant s'efforce d'assurer la disponibilité du Service. Toutefois, des interruptions peuvent survenir notamment pour maintenance, mise à jour ou incidents techniques.",
  },
  {
    title: '14. Modification des conditions',
    text: "Les présentes conditions d'utilisation peuvent être modifiées à tout moment. Les utilisateurs seront informés des modifications via le portail du Service ou par notification.",
  },
  {
    title: '15. Support',
    text: "Pour toute question ou assistance relative au Service, les utilisateurs peuvent contacter le support informatique ou l'administrateur du Service.",
  },
];

function TermsModal({ onClose, onAccept }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-NFS-border shrink-0">
          <div className="flex items-center gap-2.5">
            <ScrollText size={18} className="text-NFS-primary" />
            <div>
              <h2 className="text-base font-bold text-NFS-dark leading-tight">Conditions d&apos;utilisation</h2>
              <p className="text-xs text-NFS-muted">Service de Transfert Sécurisé — IDS Secure Transport</p>
            </div>
          </div>
          <button onClick={onClose} className="text-NFS-muted hover:text-NFS-dark transition-colors p-1 rounded-lg hover:bg-NFS-100">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm text-NFS-text leading-relaxed">
          {CGU_SECTIONS.map((s) => (
            <div key={s.title}>
              <h3 className="font-semibold text-NFS-dark mb-1">{s.title}</h3>
              <p className="text-NFS-muted">{s.text}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-NFS-border shrink-0 bg-NFS-bg rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-NFS-muted border border-NFS-border hover:text-NFS-dark transition-colors">
            Fermer
          </button>
          <button
            onClick={onAccept}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-NFS-primary text-white hover:bg-NFS-dark transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 size={15} /> J&apos;accepte les conditions
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';

  const [form, setForm]       = useState({ ...INITIAL, email: prefillEmail });
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [isInternalUser, setIsInternal] = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [acceptedTerms, setAccepted]    = useState(false);
  const [showTerms, setShowTerms]       = useState(false);
  const [termsError, setTermsError]     = useState(false);

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

    if (!acceptedTerms) {
      setTermsError(true);
      document.getElementById('cgu-checkbox')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const payload = {
        firstName:      form.firstName,
        lastName:       form.lastName,
        email:          form.email,
        phone:          form.phone,
        organisation:   form.organisation,
        country:        form.country,
        city:           form.city,
        password:       form.password,
        isInternalUser,
      };

      await authAPI.register(payload);
      setSubmitted(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── État "soumis avec succès" ──────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <AuthVisualPanel
          title={<>Bienvenue sur IDS Secure Transport<br />la plateforme de partage de fichiers sécurisé du Port Autonome d'Abidjan</>}
          description="IDS Secure Transport est la solution officielle de transfert sécurisé de fichiers du Port Autonome d'Abidjan. Votre demande sera examinée par un administrateur."
          features={['Accès sur validation administrative', 'Transfert chiffré AES-256', 'Protection de vos données']}
        />
        <div className="relative flex-1 flex items-center justify-center px-6 py-10 bg-NFS-bg">
          <div className="relative z-10 w-full max-w-sm text-center space-y-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 mx-auto">
              <Clock size={32} className="text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-NFS-dark">Demande envoyée !</h1>
            <p className="text-sm text-NFS-muted leading-relaxed">
              Votre compte a été créé et est en attente de validation par un administrateur.
              Vous recevrez un email dès que votre accès sera activé.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-NFS-primary text-white text-sm font-semibold hover:bg-NFS-dark transition-colors">
              Retour à la connexion <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthVisualPanel
        title={<>Rejoignez IDS Secure Transport<br />la plateforme de partage de fichiers sécurisé du Port Autonome d'Abidjan</>}
        description="IDS Secure Transport est la solution officielle de transfert sécurisé de fichiers du Port Autonome d'Abidjan. Votre demande d'accès sera examinée par un administrateur."
        features={['Accès sur validation administrative', 'Transfert chiffré AES-256', 'Protection de vos données']}
      />

      {/* Right form panel */}
      <div className="relative flex-1 flex items-start justify-center overflow-hidden px-6 py-10 bg-NFS-bg overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.08]" aria-hidden="true">
          <Image src="/logo.png" alt="" width={640} height={640} className="h-auto w-[320px] sm:w-[430px] lg:w-[640px]" />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-6">
            <p className="text-xs font-semibold text-NFS-primary uppercase tracking-widest mb-1">Port Autonome d&apos;Abidjan</p>
            <h1 className="text-2xl font-bold text-NFS-dark">Demande d&apos;accès à IDS Secure Transport</h1>
            <p className="text-sm text-NFS-muted mt-1">Plateforme de partage de fichiers sécurisé</p>
          </div>

          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
            <Info size={15} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-NFS-dark leading-relaxed">
              L&apos;accès à <strong>IDS Secure Transport</strong> est réservé aux agents et partenaires du <strong>Port Autonome d&apos;Abidjan</strong>. Votre demande sera <strong>validée par un administrateur</strong> avant activation.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl p-6 space-y-4 shadow-lg shadow-NFS-dark/8 border border-NFS-border">

            {/* Prénom / Nom */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" required error={errors.firstName} valid={isValid('firstName')}>
                <input type="text" placeholder="Jean" value={form.firstName} maxLength={50}
                  onChange={set('firstName')} onBlur={blur('firstName')} className={inputClass(errors.firstName, isValid('firstName'))} />
              </Field>
              <Field label="Nom" required error={errors.lastName} valid={isValid('lastName')}>
                <input type="text" placeholder="Dupont" value={form.lastName} maxLength={50}
                  onChange={set('lastName')} onBlur={blur('lastName')} className={inputClass(errors.lastName, isValid('lastName'))} />
              </Field>
            </div>

            {/* Email */}
            <Field label="Email" required error={errors.email} valid={isValid('email')}>
              <input type="email" placeholder="jean@exemple.com" value={form.email}
                onChange={set('email')} onBlur={blur('email')} autoComplete="email"
                className={inputClass(errors.email, isValid('email'))} />
            </Field>

            {/* Organisation */}
            <Field label="Organisation" required error={errors.organisation} valid={isValid('organisation')}>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-NFS-muted" />
                <input type="text" placeholder="Entreprise ou organisme" value={form.organisation} maxLength={100}
                  onChange={set('organisation')} onBlur={blur('organisation')}
                  className={inputClass(errors.organisation, isValid('organisation')) + ' pl-8'} />
              </div>
            </Field>

            {/* Pays */}
            <Field label="Pays" required error={errors.country} valid={isValid('country')}>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-NFS-muted" />
                <input type="text" placeholder="France" value={form.country} maxLength={100}
                  onChange={set('country')} onBlur={blur('country')}
                  className={inputClass(errors.country, isValid('country')) + ' pl-8'} />
              </div>
            </Field>

            {/* Téléphone */}
            <Field label="Téléphone (sans préfixe)" required error={errors.phone} valid={isValid('phone')}>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-NFS-muted" />
                <input type="tel" placeholder="612345678" value={form.phone} maxLength={15}
                  onChange={set('phone')} onBlur={blur('phone')}
                  className={inputClass(errors.phone, isValid('phone')) + ' pl-8'} />
              </div>
            </Field>

            {/* Utilisateur interne */}
            <div className="flex items-center justify-between gap-3 bg-NFS-100 border border-NFS-border rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-NFS-dark">Utilisateur interne ?</p>
                <p className="text-xs text-NFS-muted mt-0.5">Cochez si vous faites partie de l&apos;organisation interne au Port Autonome d&apos;Abidjan.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsInternal((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isInternalUser ? 'bg-NFS-primary' : 'bg-NFS-border'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${isInternalUser ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Mot de passe */}
            <div className="border-t border-NFS-border pt-4 space-y-4">
              <Field label="Mot de passe" required error={errors.password} valid={isValid('password')}>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                    onChange={set('password')} onBlur={blur('password')} autoComplete="new-password"
                    className={inputClass(errors.password, isValid('password')) + ' pr-10'} />
                  <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-NFS-muted hover:text-NFS-dark">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthBar password={form.password} />
              </Field>

              {form.password && (
                <Field label="Confirmer le mot de passe" required={!!form.password} error={errors.confirmPassword} valid={isValid('confirmPassword')}>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} placeholder="••••••••" value={form.confirmPassword}
                      onChange={set('confirmPassword')} onBlur={blur('confirmPassword')} autoComplete="new-password"
                      className={inputClass(errors.confirmPassword, isValid('confirmPassword')) + ' pr-10'} />
                    <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-NFS-muted hover:text-NFS-dark">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
              )}
            </div>

            {/* Case à cocher CGU */}
            <div id="cgu-checkbox" className={[
              'flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
              termsError && !acceptedTerms
                ? 'bg-red-50 border-red-300'
                : 'bg-NFS-100 border-NFS-border',
            ].join(' ')}>
              <input
                id="terms-checkbox"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => { setAccepted(e.target.checked); if (e.target.checked) setTermsError(false); }}
                className="mt-0.5 h-4 w-4 rounded border-NFS-border accent-NFS-primary cursor-pointer shrink-0"
              />
              <label htmlFor="terms-checkbox" className="text-xs text-NFS-dark leading-relaxed cursor-pointer select-none">
                J&apos;ai lu et j&apos;accepte les{' '}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-NFS-primary underline underline-offset-2 hover:text-NFS-dark font-semibold transition-colors"
                >
                  conditions d&apos;utilisation
                </button>
                {' '}du service IDS Secure Transport.
              </label>
            </div>
            {termsError && !acceptedTerms && (
              <p className="text-xs text-red-500 flex items-center gap-1 -mt-2">⚠ Vous devez accepter les conditions d&apos;utilisation pour continuer.</p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-1" size="lg">
              Envoyer ma demande <ArrowRight size={16} />
            </Button>
          </form>

          {/* Modal CGU */}
          {showTerms && (
            <TermsModal
              onClose={() => setShowTerms(false)}
              onAccept={() => { setAccepted(true); setTermsError(false); setShowTerms(false); }}
            />
          )}

          <p className="text-center text-sm text-NFS-muted mt-5">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-NFS-primary hover:text-NFS-dark font-medium transition-colors">
              Se connecter
            </Link>
          </p>
          <p className="text-center text-xs text-NFS-muted mt-3">
            <Link href="/faq" className="hover:text-NFS-primary transition-colors underline underline-offset-2">
              Consulter la FAQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-NFS-bg flex items-center justify-center text-NFS-muted">Chargement...</div>}>
      <RegisterContent />
    </Suspense>
  );
}