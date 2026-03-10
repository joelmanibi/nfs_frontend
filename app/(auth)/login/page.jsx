'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, ArrowRight, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthVisualPanel from '@/components/auth/AuthVisualPanel';
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthVisualPanel
        title={<>Transfert de fichiers<br />sécurisé et chiffré</>}
        description="Envoyez et recevez vos fichiers en toute confiance grâce au chiffrement AES-256 de bout en bout."
        features={['Chiffrement AES-256', 'Authentification OTP', 'Protection par code']}
      />

      {/* Right form panel */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden px-6 py-12 bg-nfs-bg">
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
          <div className="hidden items-center gap-2.5 mb-8 lg:hidden">
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

