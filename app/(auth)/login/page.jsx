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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/50 mb-4">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Connexion</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">
            Entrez votre email pour recevoir un code OTP
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl"
        >
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

          {/* ── Not-registered callout ── */}
          {notRegistered && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-700/50 bg-amber-900/15 px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <UserX size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Aucun compte trouvé</p>
                  <p className="text-xs text-amber-400/80 mt-0.5 leading-relaxed">
                    L&apos;adresse <span className="font-semibold">{email.trim().toLowerCase()}</span> n&apos;est associée à aucun compte.
                  </p>
                </div>
              </div>
              <Link
                href={`/register?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium py-2 transition-colors"
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

        {/* Register link */}
        <p className="text-center text-sm text-slate-500 mt-5">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

