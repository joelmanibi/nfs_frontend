'use client';

import { useState } from 'react';
import {
  FileText, Download, Lock, Calendar,
  HardDrive, Mail, X, ShieldAlert,
  Link2, Copy, Check, Clock,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  formatDate, formatFileSize, getFileTypeLabel,
  triggerBlobDownload, getErrorMessage,
} from '@/lib/utils';
import { filesAPI, shareAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const DURATION_OPTIONS = [
  { label: '1 heure',   hours: 1 },
  { label: '6 heures',  hours: 6 },
  { label: '24 heures', hours: 24 },
  { label: '3 jours',   hours: 72 },
  { label: '7 jours',   hours: 168 },
  { label: '30 jours',  hours: 720 },
];

const BASE_URL =
  (typeof window !== 'undefined' ? window.location.origin : '') ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  'http://localhost:3000';

/** Icon tinted by file type */
function FileIcon({ filename }) {
  const ext = filename?.split('.').pop().toLowerCase();
  const colors = {
    pdf:  'text-red-500 bg-red-50 border-red-200',
    doc:  'text-nfs-primary bg-nfs-100 border-nfs-border',
    docx: 'text-nfs-primary bg-nfs-100 border-nfs-border',
    xls:  'text-green-600 bg-green-50 border-green-200',
    xlsx: 'text-green-600 bg-green-50 border-green-200',
    png:  'text-purple-500 bg-purple-50 border-purple-200',
    jpg:  'text-purple-500 bg-purple-50 border-purple-200',
    jpeg: 'text-purple-500 bg-purple-50 border-purple-200',
  };
  const cls = colors[ext] || 'text-nfs-primary bg-nfs-100 border-nfs-border';
  return (
    <div className={`flex items-center justify-center w-11 h-11 rounded-xl border shrink-0 ${cls}`}>
      <FileText size={19} />
    </div>
  );
}

/**
 * @param {{ file: object, mode: 'inbox' | 'sent' }} props
 */
export default function FileCard({ file, mode }) {
  const [showCode, setShowCode]       = useState(false);
  const [code, setCode]               = useState('');
  const [codeError, setCodeError]     = useState('');
  const [attemptsLeft, setAttempts]   = useState(null);
  const [loading, setLoading]         = useState(false);

  // ── Share link state ──────────────────────────────────────────────────────
  const [showShare, setShowShare]     = useState(false);
  const [selectedHours, setHours]     = useState(24);
  const [shareLoading, setShareLoad]  = useState(false);
  const [generatedLink, setGenLink]   = useState(null);  // { url, expiresAt }
  const [copied, setCopied]           = useState(false);

  const openCodeInput = () => {
    setShowCode(true);
    setCodeError('');
    setCode('');
  };

  const cancelCode = () => {
    setShowCode(false);
    setCode('');
    setCodeError('');
    setAttempts(null);
  };

  const openShare = () => {
    setShowShare(true);
    setGenLink(null);
    setCopied(false);
  };
  const closeShare = () => { setShowShare(false); setGenLink(null); };

  const handleGenerateLink = async () => {
    setShareLoad(true);
    try {
      const { data } = await shareAPI.createLink(file.id, selectedHours);
      const url = `${BASE_URL}/download/${data.token}`;
      setGenLink({ url, expiresAt: data.expiresAt });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setShareLoad(false);
    }
  };

  const copyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownload = async () => {
    // Protected but no code yet → reveal input
    if (file.isProtected && !showCode) { openCodeInput(); return; }
    // Protected with input open → validate locally first
    if (file.isProtected && !code.trim()) {
      setCodeError('Veuillez entrer le code de protection.');
      return;
    }

    setLoading(true);
    setCodeError('');
    try {
      const { data } = await filesAPI.download(
        file.id,
        file.isProtected ? code.trim() : undefined,
      );
      triggerBlobDownload(data, file.originalName);
      toast.success('Téléchargement démarré');
      cancelCode();
    } catch (err) {
      const msg  = getErrorMessage(err);
      const left = err?.response?.data?.attemptsLeft;
      // Show error inline instead of a toast (stays visible for retry)
      setCodeError(left !== undefined ? `${msg} (${left} tentative${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''})` : msg);
      if (left !== undefined) setAttempts(left);
      if (left === 0) {
        toast.error('Trop de tentatives. Demandez le code à l\'expéditeur.');
        cancelCode();
      }
    } finally {
      setLoading(false);
    }
  };

  const typeLabel = getFileTypeLabel(file.originalName);

  return (
    <div className="bg-white border border-nfs-border rounded-2xl p-4 hover:shadow-md hover:border-nfs-primary/30 transition-all duration-200 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <FileIcon filename={file.originalName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-nfs-dark truncate" title={file.originalName}>
            {file.originalName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge color="blue">{typeLabel}</Badge>
            {file.isProtected && (
              <Badge color="yellow" dot><Lock size={10} /> Protégé</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-nfs-muted">
        <span className="flex items-center gap-1.5">
          <HardDrive size={11} /> {formatFileSize(file.size)}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar size={11} /> {formatDate(file.createdAt)}
        </span>
        {mode === 'sent' && file.receiverEmail && (
          <span className="flex items-center gap-1.5 col-span-2 truncate">
            <Mail size={11} /> {file.receiverEmail}
          </span>
        )}
        {mode === 'inbox' && file.sender?.email && (
          <span className="flex items-center gap-1.5 col-span-2 truncate">
            <Mail size={11} /> De : {file.sender.email}
          </span>
        )}
      </div>

      {/* ── Protected code input panel ───────────────────────────── */}
      {showCode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
              <ShieldAlert size={13} /> Code de protection requis
            </p>
            <button
              onClick={cancelCode}
              className="text-nfs-muted hover:text-nfs-dark transition-colors"
              aria-label="Annuler"
            >
              <X size={14} />
            </button>
          </div>

          <input
            type="password"
            placeholder="Entrez le code…"
            value={code}
            autoFocus
            onChange={(e) => { setCode(e.target.value); setCodeError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
            className={[
              'w-full rounded-xl px-3 py-2 text-sm bg-white text-nfs-text placeholder-nfs-muted',
              'focus:outline-none focus:ring-2 transition-colors border',
              codeError
                ? 'border-red-400 focus:ring-red-400'
                : 'border-amber-300 focus:ring-amber-400',
            ].join(' ')}
          />

          {codeError && (
            <p className="text-xs text-red-500 flex items-center gap-1">⚠ {codeError}</p>
          )}
        </div>
      )}

      {/* ── Share link panel — sent only ─────────────────────────────── */}
      {mode === 'sent' && showShare && (
        <div className="rounded-xl border border-nfs-border bg-nfs-bg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-nfs-dark flex items-center gap-1.5">
              <Link2 size={13} /> Générer un lien public
            </p>
            <button onClick={closeShare} className="text-nfs-muted hover:text-nfs-dark transition-colors">
              <X size={14} />
            </button>
          </div>

          {!generatedLink ? (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => setHours(opt.hours)}
                    className={[
                      'px-2 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      selectedHours === opt.hours
                        ? 'bg-nfs-primary text-white border-nfs-primary'
                        : 'bg-white text-nfs-muted border-nfs-border hover:border-nfs-primary/50',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button size="sm" loading={shareLoading} onClick={handleGenerateLink} className="w-full">
                <Link2 size={13} /> Générer le lien
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-nfs-muted">
                <Clock size={11} />
                Expire le {formatDate(generatedLink.expiresAt)}
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={generatedLink.url}
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-xs bg-white border border-nfs-border text-nfs-text truncate focus:outline-none"
                />
                <button
                  onClick={copyLink}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-nfs-primary text-white text-xs font-medium hover:bg-nfs-primary/90 transition-colors"
                >
                  {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
                </button>
              </div>
              <button
                onClick={() => setGenLink(null)}
                className="text-xs text-nfs-muted hover:text-nfs-dark underline transition-colors"
              >
                Changer la durée
              </button>
            </>
          )}
        </div>
      )}

      {/* Actions — inbox only */}
      {mode === 'inbox' && (
        <div className="flex gap-2 mt-auto">
          {showCode && (
            <Button variant="secondary" size="sm" onClick={cancelCode} className="shrink-0">
              <X size={13} /> Annuler
            </Button>
          )}
          <Button size="sm" loading={loading} onClick={handleDownload} className="flex-1">
            <Download size={14} />
            {showCode ? 'Confirmer' : 'Télécharger'}
          </Button>
        </div>
      )}

      {/* Actions — sent only */}
      {mode === 'sent' && !showShare && (
        <div className="mt-auto">
          <Button variant="secondary" size="sm" onClick={openShare} className="w-full">
            <Link2 size={13} /> Générer un lien de partage
          </Button>
        </div>
      )}
    </div>
  );
}

