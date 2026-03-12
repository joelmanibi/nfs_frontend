'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText, Download, Clock, AlertTriangle,
  CheckCircle2, Loader2, ShieldOff, ShieldAlert, Eye, EyeOff,
} from 'lucide-react';
import { formatFileSize, formatDate } from '@/lib/utils';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function PublicDownloadPage() {
  const { token } = useParams();

  const [status, setStatus]         = useState('loading'); // loading | ready | expired | error
  const [fileInfo, setFileInfo]     = useState(null);
  const [message, setMessage]       = useState('');

  // Code de protection
  const [code, setCode]             = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [codeError, setCodeError]   = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE}/share/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 410) { setStatus('expired'); setMessage(data.message); return; }
        if (!res.ok)            { setStatus('error');   setMessage(data.message); return; }
        setFileInfo(data);
        setStatus('ready');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Impossible de joindre le serveur. Réessayez plus tard.');
      });
  }, [token]);

  const handleDownload = async () => {
    if (fileInfo?.isProtected && !code.trim()) {
      setCodeError('Veuillez entrer le code de téléchargement.');
      return;
    }

    setDownloading(true);
    setCodeError('');

    try {
      const res = await fetch(`${API_BASE}/share/${token}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadCode: code.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCodeError(data.message || 'Erreur lors du téléchargement.');
        return;
      }

      // Déclencher le téléchargement via blob
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = fileInfo.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setCodeError('Impossible de joindre le serveur. Réessayez plus tard.');
    } finally {
      setDownloading(false);
    }
  };

  /* ─── Loading ─── */
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nfs-bg">
        <div className="flex flex-col items-center gap-3 text-nfs-muted">
          <Loader2 size={32} className="animate-spin text-nfs-primary" />
          <p className="text-sm">Vérification du lien…</p>
        </div>
      </div>
    );
  }

  /* ─── Expired ─── */
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nfs-bg p-4">
        <div className="bg-white border border-nfs-border rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 border border-red-200 mx-auto">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-nfs-dark">Lien expiré</h1>
          <p className="text-sm text-nfs-muted">{message || 'Ce lien de téléchargement n\'est plus valide.'}</p>
          <p className="text-xs text-nfs-muted/70">Contactez l'expéditeur pour obtenir un nouveau lien.</p>
        </div>
      </div>
    );
  }

  /* ─── Error ─── */
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nfs-bg p-4">
        <div className="bg-white border border-nfs-border rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 mx-auto">
            <ShieldOff size={24} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-nfs-dark">Lien introuvable</h1>
          <p className="text-sm text-nfs-muted">{message || 'Ce lien est invalide ou a déjà été utilisé.'}</p>
        </div>
      </div>
    );
  }

  /* ─── Ready ─── */
  return (
    <div className="min-h-screen flex items-center justify-center bg-nfs-bg p-4">
      <div className="bg-white border border-nfs-border rounded-2xl shadow-lg p-8 max-w-md w-full space-y-6">
        {/* Brand */}
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-nfs-primary uppercase">NFS — Partage sécurisé</p>
        </div>

        {/* File info */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-nfs-bg border border-nfs-border">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-nfs-100 border border-nfs-border shrink-0">
            <FileText size={22} className="text-nfs-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-nfs-dark truncate" title={fileInfo.originalName}>
              {fileInfo.originalName}
            </p>
            <p className="text-xs text-nfs-muted mt-0.5">
              {formatFileSize(fileInfo.size)}
            </p>
          </div>
        </div>

        {/* Expiry */}
        <div className="flex items-center gap-2 text-xs text-nfs-muted bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle2 size={13} className="text-green-500 shrink-0" />
          <span>Lien valide jusqu&apos;au <strong className="text-nfs-dark">{formatDate(fileInfo.expiresAt)}</strong></span>
        </div>

        {/* Code de protection */}
        {fileInfo.isProtected && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <ShieldAlert size={13} className="shrink-0 mt-0.5" />
              <span>Ce fichier est protégé. Entrez le code fourni par l&apos;expéditeur pour le télécharger.</span>
            </div>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Code de téléchargement…"
                value={code}
                autoFocus
                onChange={(e) => { setCode(e.target.value); setCodeError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                className={[
                  'w-full rounded-xl px-3 py-2.5 pr-10 text-sm bg-white border',
                  'focus:outline-none focus:ring-2 transition-colors',
                  codeError
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-amber-300 focus:ring-amber-300',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-nfs-muted hover:text-nfs-dark transition-colors"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {codeError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle size={11} /> {codeError}
              </p>
            )}
          </div>
        )}

        {/* Erreur non-protégé */}
        {!fileInfo.isProtected && codeError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle size={11} /> {codeError}
          </p>
        )}

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-nfs-primary text-white text-sm font-semibold hover:bg-nfs-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-nfs-primary/20"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {downloading ? 'Téléchargement…' : 'Télécharger le fichier'}
        </button>

        <p className="text-center text-xs text-nfs-muted/60">
          Fichier chiffré AES-256 · Déchiffré à la volée
        </p>
      </div>
    </div>
  );
}

