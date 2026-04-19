'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Inbox, Send, FileText, Download, Lock, Hash,
  HardDrive, Mail, Link2, Copy, Check, Clock,
  ShieldOff, Shield, Trash2, X, ShieldAlert,
  Search, CalendarRange, RotateCcw, CheckCircle2, Hourglass,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import {
  formatDate, formatFileSize,
  triggerBlobDownload, getErrorMessage,
} from '@/lib/utils';
import { filesAPI, shareAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const DEFAULT_PAGE_SIZE = 10;

const DURATION_OPTIONS = [
  { label: '1h',  hours: 1   },
  { label: '6h',  hours: 6   },
  { label: '24h', hours: 24  },
  { label: '3j',  hours: 72  },
  { label: '7j',  hours: 168 },
  { label: '15j', hours: 360 },
];

const BASE_URL =
  (typeof window !== 'undefined' ? window.location.origin : '') ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  'https://securetransport.paa.ci';

// ── File type icon + badge ─────────────────────────────────────────────────────
function FileTypeCell({ filename }) {
  const ext = filename?.split('.').pop().toLowerCase();
  const cfg = ({
    pdf:  { cls: 'text-red-500 bg-red-50 border-red-200',         label: 'PDF'  },
    doc:  { cls: 'text-NFS-primary bg-NFS-100 border-NFS-border',  label: 'DOC'  },
    docx: { cls: 'text-NFS-primary bg-NFS-100 border-NFS-border',  label: 'DOCX' },
    xls:  { cls: 'text-green-600 bg-green-50 border-green-200',    label: 'XLS'  },
    xlsx: { cls: 'text-green-600 bg-green-50 border-green-200',    label: 'XLSX' },
    png:  { cls: 'text-purple-500 bg-purple-50 border-purple-200', label: 'PNG'  },
    jpg:  { cls: 'text-purple-500 bg-purple-50 border-purple-200', label: 'JPG'  },
    jpeg: { cls: 'text-purple-500 bg-purple-50 border-purple-200', label: 'JPEG' },
  })[ext] || { cls: 'text-NFS-primary bg-NFS-100 border-NFS-border', label: ext?.toUpperCase() || '–' };
  return (
    <div className="flex items-center gap-2">
      <span className={`flex items-center justify-center w-8 h-8 rounded-lg border shrink-0 ${cfg.cls}`}>
        <FileText size={14} />
      </span>
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${cfg.cls}`}>
        {cfg.label}
      </span>
    </div>
  );
}

// ── Per-row component with its own action state ────────────────────────────────
function FileTableRow({ file, mode, onUpdated, onDeleted }) {
  const [panel, setPanel]           = useState(null); // null | 'download' | 'share'
  const [code, setCode]             = useState('');
  const [codeError, setCodeError]   = useState('');
  const [dlLoading, setDlLoading]   = useState(false);
  const [selectedHours, setHours]   = useState(24);
  const [shareLoading, setShareLoad]= useState(false);
  const [generatedLink, setGenLink] = useState(null);
  const [copied, setCopied]         = useState(false);
  const [blocking, setBlocking]     = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const closePanel = () => { setPanel(null); setCode(''); setCodeError(''); setGenLink(null); };

  const handleDownload = async () => {
    if (file.isProtected && panel !== 'download') { setPanel('download'); return; }
    if (file.isProtected && !code.trim()) { setCodeError('Code requis.'); return; }
    setDlLoading(true); setCodeError('');
    try {
      const { data } = await filesAPI.download(file.id, file.isProtected ? code.trim() : undefined);
      triggerBlobDownload(data, file.originalName);
      toast.success('Téléchargement démarré');
      closePanel();
    } catch (err) {
      const msg  = getErrorMessage(err);
      const left = err?.response?.data?.attemptsLeft;
      setCodeError(left !== undefined
        ? `${msg} (${left} tentative${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''})`
        : msg);
      if (left === 0) { toast.error('Trop de tentatives.'); closePanel(); }
    } finally { setDlLoading(false); }
  };

  const handleBlock = async () => {
    setBlocking(true);
    try {
      const { data } = await filesAPI.blockFile(file.id);
      onUpdated?.({ ...file, isBlocked: data.isBlocked });
      toast.success(data.isBlocked ? 'Fichier bloqué.' : 'Fichier débloqué.');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setBlocking(false); }
  };

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    try {
      await filesAPI.deleteFile(file.id);
      onDeleted?.(file.id);
      toast.success('Fichier supprimé.');
    } catch (err) { toast.error(getErrorMessage(err)); setDeleting(false); setConfirmDel(false); }
  };

  const handleGenerateLink = async () => {
    setShareLoad(true);
    try {
      const { data } = await shareAPI.createLink(file.id, selectedHours);
      setGenLink({ url: `${BASE_URL}/download/${data.token}`, expiresAt: data.expiresAt });
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setShareLoad(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink.url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Row JSX ─────────────────────────────────────────────────────────────────
  return (
    <>
      <tr className="border-b border-NFS-border/60 hover:bg-NFS-100/30 transition-colors duration-150">
        {/* Référence */}
        <td className="px-4 py-3.5 w-36">
          {file.reference
            ? <span className="font-mono text-xs text-NFS-primary font-semibold select-all">{file.reference}</span>
            : <span className="text-NFS-muted/40 text-xs">—</span>}
        </td>

        {/* Fichier */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <FileTypeCell filename={file.originalName} />
            <span className="text-sm font-medium text-NFS-dark truncate max-w-[220px]" title={file.originalName}>
              {file.originalName}
            </span>
          </div>
        </td>

        {/* Taille */}
        <td className="px-4 py-3.5 text-xs text-NFS-muted whitespace-nowrap">
          <span className="flex items-center gap-1"><HardDrive size={11} /> {formatFileSize(file.size)}</span>
        </td>

        {/* Expéditeur / Destinataire */}
        <td className="px-4 py-3.5 text-xs text-NFS-muted max-w-[180px]">
          <span className="flex items-center gap-1 truncate" title={mode === 'inbox' ? file.sender?.email : file.receiverEmail}>
            <Mail size={11} className="shrink-0" />
            <span className="truncate">
              {mode === 'inbox' ? (file.sender?.email || '—') : (file.receiverEmail || '—')}
            </span>
          </span>
        </td>

        {/* Date */}
        <td className="px-4 py-3.5 text-xs text-NFS-muted whitespace-nowrap">{formatDate(file.createdAt)}</td>

        {/* Statut */}
        <td className="px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {file.isProtected && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium whitespace-nowrap">
                <Lock size={10} /> Protégé
              </span>
            )}
            {file.isBlocked && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium whitespace-nowrap">
                <ShieldOff size={10} /> Bloqué
              </span>
            )}
            {mode === 'sent' && (
              file.downloadedAt ? (
                <span title={`Téléchargé par ${file.downloadedBy} le ${formatDate(file.downloadedAt)}`}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium whitespace-nowrap">
                  <CheckCircle2 size={10} /> Téléchargé
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200 font-medium whitespace-nowrap">
                  <Hourglass size={10} /> En attente
                </span>
              )
            )}
            {mode === 'inbox' && !file.isProtected && !file.isBlocked && <span className="text-xs text-NFS-muted/40">—</span>}
          </div>
        </td>

        {/* Actions */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5 flex-nowrap">
            <button onClick={handleDownload} title="Télécharger"
              className="p-1.5 rounded-lg text-NFS-primary bg-NFS-100 hover:bg-NFS-primary hover:text-white border border-NFS-border/50 transition-all">
              <Download size={13} />
            </button>
            {mode === 'sent' && (
              <button onClick={() => setPanel(panel === 'share' ? null : 'share')} title="Lien de partage"
                className={`p-1.5 rounded-lg border transition-all ${panel === 'share' ? 'bg-NFS-primary text-white border-NFS-primary' : 'text-NFS-muted bg-white hover:bg-NFS-100 border-NFS-border/50'}`}>
                <Link2 size={13} />
              </button>
            )}
            {mode === 'sent' && (
              <button onClick={handleBlock} disabled={blocking} title={file.isBlocked ? 'Débloquer' : 'Bloquer'}
                className={`p-1.5 rounded-lg border transition-all disabled:opacity-50 ${file.isBlocked ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}>
                {blocking
                  ? <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                  : file.isBlocked ? <Shield size={13} /> : <ShieldOff size={13} />}
              </button>
            )}
            {mode === 'sent' && !confirmDel && (
              <button onClick={handleDelete} title="Supprimer"
                className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-all">
                <Trash2 size={13} />
              </button>
            )}
            {mode === 'sent' && confirmDel && (
              <div className="flex items-center gap-1">
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                  {deleting ? <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : 'OK'}
                </button>
                <button onClick={() => setConfirmDel(false)}
                  className="px-2 py-1 rounded-lg text-xs border border-NFS-border text-NFS-muted hover:text-NFS-dark">✕</button>
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* ── Expanded panel ──────────────────────────────────────────────────── */}
      {panel && (
        <tr className="bg-NFS-100/20">
          <td colSpan={7} className="px-6 pb-4 pt-0">
            {panel === 'download' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2 max-w-md mt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
                    <ShieldAlert size={13} /> Code de protection requis
                  </p>
                  <button onClick={closePanel} className="text-NFS-muted hover:text-NFS-dark transition-colors"><X size={14} /></button>
                </div>
                <input type="password" placeholder="Entrez le code…" value={code} autoFocus
                  onChange={(e) => { setCode(e.target.value); setCodeError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                  className={`w-full rounded-xl px-3 py-2 text-sm bg-white placeholder-NFS-muted focus:outline-none focus:ring-2 border ${codeError ? 'border-red-400 focus:ring-red-400' : 'border-amber-300 focus:ring-amber-400'}`}
                />
                {codeError && <p className="text-xs text-red-500">⚠ {codeError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" loading={dlLoading} onClick={handleDownload} className="flex-1">
                    <Download size={13} /> Confirmer
                  </Button>
                  <Button variant="secondary" size="sm" onClick={closePanel}>Annuler</Button>
                </div>
              </div>
            )}
            {panel === 'share' && (
              <div className="rounded-xl border border-NFS-border bg-white p-3 space-y-3 max-w-md mt-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-NFS-dark flex items-center gap-1.5"><Link2 size={13} /> Générer un lien public</p>
                  <button onClick={closePanel} className="text-NFS-muted hover:text-NFS-dark transition-colors"><X size={14} /></button>
                </div>
                {!generatedLink ? (
                  <>
                    <div className="grid grid-cols-6 gap-1.5">
                      {DURATION_OPTIONS.map((opt) => (
                        <button key={opt.hours} onClick={() => setHours(opt.hours)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedHours === opt.hours ? 'bg-NFS-primary text-white border-NFS-primary' : 'bg-white text-NFS-muted border-NFS-border hover:border-NFS-primary/50'}`}>
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
                    <div className="flex items-center gap-2 text-xs text-NFS-muted">
                      <Clock size={11} /> Expire le {formatDate(generatedLink.expiresAt)}
                    </div>
                    <div className="flex items-center gap-2">
                      <input readOnly value={generatedLink.url}
                        className="flex-1 rounded-lg px-2.5 py-1.5 text-xs bg-NFS-100/40 border border-NFS-border text-NFS-text truncate focus:outline-none" />
                      <button onClick={copyLink}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-NFS-primary text-white text-xs font-medium hover:bg-NFS-primary/90 transition-colors">
                        {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
                      </button>
                    </div>
                    <button onClick={() => setGenLink(null)} className="text-xs text-NFS-muted hover:text-NFS-dark underline transition-colors">
                      Changer la durée
                    </button>
                  </>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}



// ── Main list component ───────────────────────────────────────────────────────
export default function FileList({ files = [], mode, loading, onUpdated, onDeleted }) {
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [refFilter, setRefFilter] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return files.filter((f) => {
      if (refFilter && !f.reference?.toLowerCase().includes(refFilter.toLowerCase())) return false;
      if (dateFrom) {
        const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
        if (new Date(f.createdAt) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
        if (new Date(f.createdAt) > to) return false;
      }
      return true;
    });
  }, [files, refFilter, dateFrom, dateTo]);

  const hasFilters = !!(refFilter || dateFrom || dateTo);
  const resetFilters = () => { setRefFilter(''); setDateFrom(''); setDateTo(''); };

  useEffect(() => { setPage(1); }, [filtered, pageSize]);

  const totalPages   = Math.ceil(filtered.length / pageSize);
  const safePage     = Math.min(page, Math.max(1, totalPages));
  const start        = (safePage - 1) * pageSize;
  const visibleFiles = filtered.slice(start, start + pageSize);

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-white border border-NFS-border rounded-2xl px-4 py-3 h-14" />
        <div className="bg-white border border-NFS-border rounded-2xl overflow-hidden">
          <div className="h-11 bg-NFS-100/60 border-b border-NFS-border" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-NFS-border/40">
              {[36, 200, 60, 140, 120, 60, 80].map((w, j) => (
                <div key={j} className="h-4 bg-NFS-100 rounded-full shrink-0" style={{ width: w }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty or no-match state ───────────────────────────────────────────────
  const EmptyIcon  = mode === 'inbox' ? Inbox : Send;
  const emptyLabel = hasFilters
    ? 'Aucun fichier ne correspond aux filtres appliqués.'
    : mode === 'inbox' ? 'Aucun fichier reçu pour le moment.' : 'Aucun fichier envoyé pour le moment.';

  return (
    <div className="space-y-4">

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-NFS-border rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Reference search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-NFS-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrer par référence…"
            value={refFilter}
            onChange={(e) => setRefFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-NFS-border bg-NFS-100/40 text-NFS-text placeholder-NFS-muted focus:outline-none focus:ring-2 focus:ring-NFS-primary/30 focus:border-NFS-primary transition-all"
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarRange size={14} className="text-NFS-muted shrink-0" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-NFS-border bg-NFS-100/40 text-NFS-text focus:outline-none focus:ring-2 focus:ring-NFS-primary/30 focus:border-NFS-primary transition-all" />
          <span className="text-NFS-muted text-xs font-medium">→</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-NFS-border bg-NFS-100/40 text-NFS-text focus:outline-none focus:ring-2 focus:ring-NFS-primary/30 focus:border-NFS-primary transition-all" />
        </div>

        {/* Reset + count */}
        {hasFilters && (
          <button onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-NFS-muted border border-NFS-border hover:bg-NFS-100/60 hover:text-NFS-dark transition-all">
            <RotateCcw size={12} /> Réinitialiser
          </button>
        )}
        <span className="text-xs text-NFS-muted ml-auto whitespace-nowrap">
          {filtered.length} fichier{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-NFS-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-NFS-border bg-NFS-100/60">
                <th className="px-4 py-3 text-xs font-semibold text-NFS-muted uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Hash size={11} /> Référence</span>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-NFS-muted uppercase tracking-wider">Fichier</th>
                <th className="px-4 py-3 text-xs font-semibold text-NFS-muted uppercase tracking-wider whitespace-nowrap">Taille</th>
                <th className="px-4 py-3 text-xs font-semibold text-NFS-muted uppercase tracking-wider">
                  {mode === 'inbox' ? 'Expéditeur' : 'Destinataire'}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-NFS-muted uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-NFS-muted uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-xs font-semibold text-NFS-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleFiles.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16">
                      <EmptyIcon size={36} className="mb-3 text-NFS-muted opacity-20" />
                      <p className="text-sm text-NFS-muted">{emptyLabel}</p>
                      {hasFilters && (
                        <button onClick={resetFilters} className="mt-3 text-xs text-NFS-primary hover:underline flex items-center gap-1">
                          <RotateCcw size={11} /> Effacer les filtres
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                visibleFiles.map((file) => (
                  <FileTableRow key={file.id} file={file} mode={mode} onUpdated={onUpdated} onDeleted={onDeleted} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={setPageSize} />
      )}
    </div>
  );
}
