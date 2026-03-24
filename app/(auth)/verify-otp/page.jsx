'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, RotateCcw, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthVisualPanel from '@/components/auth/AuthVisualPanel';
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
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const inputsRef = useRef([]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Countdown for rate-limit lockout
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
      if (err?.response?.status === 429) {
        const retryAfter = err?.response?.data?.retryAfter;
        setLockoutSeconds(retryAfter && retryAfter > 0 ? retryAfter : 300);
        setDigits(Array(OTP_LENGTH).fill(''));
        return;
      }
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthVisualPanel
        title={<>Vérification<br />en deux étapes</>}
        description="Un code à 6 chiffres a été envoyé à votre adresse email pour confirmer votre identité."
        features={['Code temporaire', 'Session sécurisée', 'Accès protégé']}
      />

      {/* Right form panel */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden px-6 py-12 bg-NFS-bg">
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
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-NFS-primary">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="text-NFS-dark font-bold text-lg">IDS Secure Transport</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-NFS-dark">Vérification OTP</h1>
            <p className="text-sm text-NFS-muted mt-1">
              Code envoyé à <span className="text-NFS-dark font-medium">{email || '…'}</span>
            </p>
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

          <div className="bg-white rounded-2xl p-6 space-y-6 shadow-lg shadow-NFS-dark/8 border border-NFS-border">
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
                  className="w-11 h-13 text-center text-xl font-bold rounded-xl bg-NFS-bg border-2 border-NFS-border text-NFS-dark focus:outline-none focus:ring-2 focus:ring-NFS-primary focus:border-NFS-primary transition-all"
                />
              ))}
            </div>

            {attemptsLeft !== null && (
              <p className="text-xs text-center text-red-500">
                ⚠ {attemptsLeft} tentative{attemptsLeft > 1 ? 's' : ''} restante{attemptsLeft > 1 ? 's' : ''}
              </p>
            )}

            <Button onClick={handleVerify} loading={loading} disabled={lockoutSeconds > 0} className="w-full" size="lg">
              Valider le code
            </Button>

            {/* Resend */}
            <div className="text-center">
              {canResend ? (
                <button
                  onClick={handleResend}
                  className="inline-flex items-center gap-1.5 text-sm text-NFS-primary hover:text-NFS-dark font-medium transition-colors"
                >
                  <RotateCcw size={13} /> Renvoyer un code
                </button>
              ) : (
                <p className="text-xs text-NFS-muted">
                  Renvoyer dans <span className="text-NFS-dark font-medium">{countdown}s</span>
                </p>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-NFS-muted mt-5">
            <Link href="/login" className="text-NFS-primary hover:text-NFS-dark font-medium transition-colors">
              ← Changer d&apos;email
            </Link>
          </p>
        </div>
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

