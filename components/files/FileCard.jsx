'use client';

import { useState } from 'react';
import {
  FileText, Download, Lock, Calendar,
  HardDrive, Mail, X, ShieldAlert,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  formatDate, formatFileSize, getFileTypeLabel,
  triggerBlobDownload, getErrorMessage,
} from '@/lib/utils';
import { filesAPI } from '@/lib/api';
import toast from 'react-hot-toast';

/** Icon tinted by file type */
function FileIcon({ filename }) {
  const ext = filename?.split('.').pop().toLowerCase();
  const colors = {
    pdf: 'text-red-400 bg-red-900/30 border-red-700/30',
    doc: 'text-blue-400 bg-blue-900/30 border-blue-700/30',
    docx: 'text-blue-400 bg-blue-900/30 border-blue-700/30',
    xls: 'text-green-400 bg-green-900/30 border-green-700/30',
    xlsx: 'text-green-400 bg-green-900/30 border-green-700/30',
    png: 'text-purple-400 bg-purple-900/30 border-purple-700/30',
    jpg: 'text-purple-400 bg-purple-900/30 border-purple-700/30',
    jpeg: 'text-purple-400 bg-purple-900/30 border-purple-700/30',
  };
  const cls = colors[ext] || 'text-blue-400 bg-blue-900/30 border-blue-700/30';
  return (
    <div className={`flex items-center justify-center w-10 h-10 rounded-lg border shrink-0 ${cls}`}>
      <FileText size={18} />
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
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 hover:border-slate-600 transition-all duration-200 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <FileIcon filename={file.originalName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-100 truncate" title={file.originalName}>
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
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-500">
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
        <div className="rounded-lg border border-yellow-700/40 bg-yellow-900/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-yellow-300 flex items-center gap-1.5">
              <ShieldAlert size={13} /> Code de protection requis
            </p>
            <button
              onClick={cancelCode}
              className="text-slate-500 hover:text-slate-300 transition-colors"
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
              'w-full rounded-lg px-3 py-2 text-sm bg-slate-800 text-slate-100 placeholder-slate-500',
              'focus:outline-none focus:ring-2 transition-colors',
              codeError
                ? 'border border-red-500 focus:ring-red-500'
                : 'border border-slate-600 focus:ring-yellow-500',
            ].join(' ')}
          />

          {codeError && (
            <p className="text-xs text-red-400 flex items-center gap-1">⚠ {codeError}</p>
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
    </div>
  );
}

