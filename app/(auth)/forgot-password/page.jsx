'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthVisualPanel from '@/components/auth/AuthVisualPanel';
import Button from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Veuillez entrer votre email.'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
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
        title={<>Réinitialiser<br />votre mot de passe</>}
        description="Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe."
        features={['Lien sécurisé', 'Valide 30 minutes', 'Aucun mot de passe exposé']}
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
            <h1 className="text-2xl font-bold text-nfs-dark">Mot de passe oublié</h1>
            <p className="text-sm text-nfs-muted mt-1">Recevez un lien de réinitialisation par email</p>
          </div>

          {sent ? (
            <div className="bg-white rounded-2xl p-6 shadow-lg shadow-nfs-dark/8 border border-nfs-border text-center space-y-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 mx-auto">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-nfs-dark">Email envoyé !</p>
                <p className="text-sm text-nfs-muted mt-1 leading-relaxed">
                  Si <span className="font-medium text-nfs-dark">{email.trim().toLowerCase()}</span> est associé à un compte,
                  vous recevrez un lien de réinitialisation dans quelques instants.
                </p>
                <p className="text-xs text-nfs-muted mt-2">Le lien est valide pendant 30 minutes.</p>
              </div>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-nfs-primary hover:text-nfs-dark font-medium transition-colors">
                <ArrowLeft size={14} /> Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-5 shadow-lg shadow-nfs-dark/8 border border-nfs-border">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-nfs-dark">
                  <span className="flex items-center gap-1.5"><Mail size={14} /> Adresse email</span>
                </label>
                <input
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  autoFocus
                  autoComplete="email"
                  className={inputClass(!!error)}
                />
                {error && <p className="text-xs text-red-500">⚠ {error}</p>}
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Envoyer le lien de réinitialisation
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

