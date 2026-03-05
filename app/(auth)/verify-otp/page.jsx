'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/utils';

const OTP_LENGTH   = 6;
const RESEND_DELAY = 60; // seconds

function VerifyOTPForm() {
  const searchParams  = useSearchParams();
  const email         = searchParams.get('email') || '';
  const { login }     = useAuth();

  const [digits, setDigits]         = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading]       = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [countdown, setCountdown]   = useState(RESEND_DELAY);
  const [canResend, setCanResend]   = useState(false);
  const inputsRef = useRef([]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const focusNext = (idx) => inputsRef.current[idx + 1]?.focus();
  const focusPrev = (idx) => inputsRef.current[idx - 1]?.focus();

  const handleChange = (idx, val) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char) focusNext(idx);
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx]) focusPrev(idx);
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    const next = [...Array(OTP_LENGTH).fill('')];
    text.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputsRef.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    const otp = digits.join('');
    if (otp.length < OTP_LENGTH) { toast.error('Entrez les 6 chiffres du code OTP.'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.verifyOTP(email, otp);
      toast.success('Authentification réussie !');
      login(data.token, data.user);
    } catch (err) {
      const left = err?.response?.data?.attemptsLeft;
      if (left !== undefined) setAttemptsLeft(left);
      toast.error(getErrorMessage(err));
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authAPI.requestOTP(email);
      toast.success('Nouveau code OTP envoyé.');
      setCountdown(RESEND_DELAY);
      setCanResend(false);
      setAttemptsLeft(null);
      setDigits(Array(OTP_LENGTH).fill(''));
    } catch {
      toast.success('Si cet email est enregistré, un OTP a été envoyé.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/50 mb-4">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Vérification OTP</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">
            Code envoyé à <span className="text-slate-200 font-medium">{email || '…'}</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          {/* OTP inputs */}
          <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-13 text-center text-xl font-bold rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            ))}
          </div>

          {attemptsLeft !== null && (
            <p className="text-xs text-center text-red-400">
              ⚠ {attemptsLeft} tentative{attemptsLeft > 1 ? 's' : ''} restante{attemptsLeft > 1 ? 's' : ''}
            </p>
          )}

          <Button onClick={handleVerify} loading={loading} className="w-full" size="lg">
            Valider le code
          </Button>

          {/* Resend */}
          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <RotateCcw size={13} /> Renvoyer un code
              </button>
            ) : (
              <p className="text-xs text-slate-500">
                Renvoyer dans <span className="text-slate-300">{countdown}s</span>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            ← Changer d&apos;email
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense>
      <VerifyOTPForm />
    </Suspense>
  );
}

