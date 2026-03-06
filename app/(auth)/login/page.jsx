'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export default function LoginPage() {
  const router  = useRouter();
  const [email, setEmail]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [notRegistered, setNotRegistered] = useState(false);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    // Reset the "not registered" banner when the user changes the email
    if (notRegistered) setNotRegistered(false);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotRegistered(false);

    if (!email.trim()) {
      setError('Veuillez entrer votre email.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authAPI.requestOTP(email.trim().toLowerCase());

      if (data.registered === false) {
        // Email not found → show inline callout, stay on page
        setNotRegistered(true);
        return;
      }

      toast.success('Un code OTP a été envoyé à votre adresse email.');
      router.push(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(getErrorMessage(err));
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
            Transfert de fichiers<br />sécurisé et chiffré
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Envoyez et recevez vos fichiers en toute confiance grâce au chiffrement AES-256 de bout en bout.
          </p>
          <div className="mt-8 space-y-3">
            {['Chiffrement AES-256', 'Authentification OTP', 'Protection par code'].map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                <span className="text-white/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/40 text-xs">© {new Date().getFullYear()} NFS — Tous droits réservés</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-nfs-bg">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-nfs-primary">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="text-nfs-dark font-bold text-lg">NFS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-nfs-dark">Connexion</h1>
            <p className="text-sm text-nfs-muted mt-1">
              Entrez votre email pour recevoir un code OTP
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-5 shadow-lg shadow-nfs-dark/8 border border-nfs-border">
            <Input
              label="Adresse email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={handleEmailChange}
              error={error}
              autoFocus
              autoComplete="email"
              required
            />

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
                Envoyer le code OTP
                <ArrowRight size={16} />
              </Button>
            )}
          </form>

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

