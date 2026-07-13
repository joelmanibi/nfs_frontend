'use client';

import { useEffect, useState } from 'react';
import {
  X, FileText, Hash, HardDrive, Mail, Clock, Lock, ShieldOff,
  Link2, Download, History, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, formatFileSize, getErrorMessage } from '@/lib/utils';
import { filesAPI } from '@/lib/api';

const METHOD_LABEL = {
  direct: { label: 'Téléchargement direct', icon: Download, cls: 'text-NFS-primary bg-NFS-100 border-NFS-border' },
  link:   { label: 'Via lien de partage',    icon: Link2,    cls: 'text-purple-600 bg-purple-50 border-purple-200' },
};

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon size={13} className="text-NFS-muted mt-0.5 shrink-0" />
      <span className="text-NFS-muted shrink-0">{label} :</span>
      <span className="text-NFS-dark font-medium min-w-0 break-words">{children}</span>
    </div>
  );
}

export default function FileDetailModal({ open, onClose, fileId }) {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !fileId) return;
    let cancelled = false;

    setLoading(true);
    filesAPI.getDetails(fileId)
      .then(({ data }) => { if (!cancelled) setFile(data.file); })
      .catch((err) => { if (!cancelled) toast.error(getErrorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [open, fileId]);

  if (!open) return null;

  const handleClose = () => { setFile(null); onClose(); };
  const logs = [...(file?.downloadLogs || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white border border-NFS-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-NFS-border sticky top-0 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={18} className="text-NFS-primary shrink-0" />
            <h2 className="text-base font-semibold text-NFS-dark truncate">
              {file ? file.originalName : 'Détail du fichier'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-NFS-muted hover:text-NFS-dark transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-NFS-muted">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : !file ? (
          <div className="py-16 text-center text-sm text-NFS-muted">Fichier introuvable.</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* ── Infos générales ── */}
            <div className="space-y-2">
              <InfoRow icon={Hash} label="Référence">{file.reference || '—'}</InfoRow>
              <InfoRow icon={HardDrive} label="Taille">{formatFileSize(file.size)}</InfoRow>
              <InfoRow icon={Mail} label="Destinataire">{file.receiverEmail}</InfoRow>
              <InfoRow icon={Clock} label="Envoyé le">{formatDate(file.createdAt)}</InfoRow>
              {file.comment && <InfoRow icon={FileText} label="Commentaire">{file.comment}</InfoRow>}
            </div>

            {/* ── Badges de statut ── */}
            <div className="flex flex-wrap items-center gap-1.5">
              {file.isProtected && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  <Lock size={10} /> Protégé
                </span>
              )}
              {file.isBlocked && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
                  <ShieldOff size={10} /> Bloqué
                </span>
              )}
              {file.shareLinks?.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 font-medium">
                  <Link2 size={10} /> {file.shareLinks.length} lien{file.shareLinks.length > 1 ? 's' : ''} de partage
                </span>
              )}
            </div>

            {/* ── Historique de téléchargement ── */}
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-NFS-muted uppercase tracking-wider mb-2">
                <History size={13} /> Historique de téléchargement ({logs.length})
              </p>

              {logs.length === 0 ? (
                <p className="text-sm text-NFS-muted italic">Ce fichier n&apos;a pas encore été téléchargé.</p>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((log) => {
                    const meta = METHOD_LABEL[log.method] || METHOD_LABEL.direct;
                    const MethodIcon = meta.icon;
                    return (
                      <div key={log.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-NFS-border bg-NFS-bg/60">
                        <span className={`flex items-center justify-center w-7 h-7 rounded-lg border shrink-0 ${meta.cls}`}>
                          <MethodIcon size={12} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-NFS-dark truncate">{log.downloadedBy}</p>
                          <p className="text-xs text-NFS-muted">{meta.label} · {formatDate(log.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
