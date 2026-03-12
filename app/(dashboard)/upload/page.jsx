'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import {
  Upload, FileText, X, Lock, Unlock, Send,
  Archive, Loader2, Link2, UserPlus, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { filesAPI } from '@/lib/api';
import { formatFileSize, getErrorMessage } from '@/lib/utils';

const LINK_DURATIONS = [
  { label: '1 heure',   value: 1   },
  { label: '6 heures',  value: 6   },
  { label: '24 heures', value: 24  },
  { label: '3 jours',   value: 72  },
  { label: '7 jours',   value: 168 },
  { label: '30 jours',  value: 720 },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_TOTAL_SIZE = 1024 * 1024 * 1024; // 1 Go (taille cumulée)

/** Compresse un tableau de File en un seul fichier .zip */
async function buildZip(files) {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, f);
  }
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const date = new Date().toISOString().slice(0, 10);
  return new File([blob], `envoi_NFS_${date}.zip`, { type: 'application/zip' });
}

export default function UploadPage() {
  const router   = useRouter();
  const inputRef = useRef();

  // ── Fichiers ──
  const [files, setFiles]       = useState([]);
  // ── Destinataires (tags) ──
  const [recipients, setRecipients] = useState([]);   // emails validés
  const [emailDraft, setEmailDraft] = useState('');   // champ en cours de saisie
  // ── Protection ──
  const [isProtected, setProtected] = useState(false);
  const [downloadCode, setCode]     = useState('');
  // ── Lien de téléchargement ──
  const [sendViaLink, setSendViaLink]         = useState(false);
  const [linkExpiresInHours, setLinkHours]    = useState(24);
  // ── UI ──
  const [dragging, setDragging] = useState(false);
  const [zipping, setZipping]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

  /* ── Gestion des tags email ── */
  const addEmailFromDraft = useCallback(() => {
    const email = emailDraft.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setErrors((e) => ({ ...e, recipients: 'Email invalide.' }));
      return;
    }
    if (recipients.includes(email)) {
      setEmailDraft('');
      return;
    }
    setRecipients((prev) => [...prev, email]);
    setEmailDraft('');
    setErrors((e) => ({ ...e, recipients: undefined }));
  }, [emailDraft, recipients]);

  const removeRecipient = (email) =>
    setRecipients((prev) => prev.filter((e) => e !== email));

  const handleEmailKeyDown = (ev) => {
    if (ev.key === 'Enter' || ev.key === ',') {
      ev.preventDefault();
      addEmailFromDraft();
    } else if (ev.key === 'Backspace' && !emailDraft && recipients.length) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  };

  /* ── Ajouter / fusionner des fichiers ── */
  const addFiles = (incoming) => {
    const next = [...files];
    for (const f of incoming) {
      if (!next.find((x) => x.name === f.name && x.size === f.size)) {
        next.push(f);
      }
    }
    const total = next.reduce((s, f) => s + f.size, 0);
    if (total > MAX_TOTAL_SIZE) {
      toast.error('Taille totale dépassée (max 1 Go).');
      return;
    }
    setFiles(next);
    setErrors((e) => ({ ...e, file: undefined }));
  };

  const removeFile = (idx) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const clearAll = () => setFiles([]);

  /* ── Drag & drop ── */
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles([...e.dataTransfer.files]);
  };

  /* ── Validation ── */
  const validate = (finalEmails) => {
    const e = {};
    if (!files.length) e.file = 'Veuillez sélectionner au moins un fichier.';
    if (!finalEmails.length) e.recipients = 'Ajoutez au moins un destinataire.';
    if (isProtected && !downloadCode.trim())
      e.downloadCode = 'Code de protection requis.';
    return e;
  };

  /* ── Soumission ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Inclure le brouillon en cours s'il est valide
    const draftEmail = emailDraft.trim().toLowerCase();
    const finalEmails = draftEmail && EMAIL_RE.test(draftEmail) && !recipients.includes(draftEmail)
      ? [...recipients, draftEmail]
      : [...recipients];

    const errs = validate(finalEmails);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    if (finalEmails.length !== recipients.length) {
      setRecipients(finalEmails);
      setEmailDraft('');
    }

    let fileToSend;
    if (files.length === 1) {
      fileToSend = files[0];
    } else {
      setZipping(true);
      try {
        fileToSend = await buildZip(files);
        toast.success(`${files.length} fichiers compressés en ZIP (${formatFileSize(fileToSend.size)})`);
      } catch {
        toast.error('Échec de la compression. Réessayez.');
        setZipping(false);
        return;
      }
      setZipping(false);
    }

    setLoading(true);
    const fd = new FormData();
    fd.append('file', fileToSend);
    fd.append('receiverEmails', JSON.stringify(finalEmails));
    fd.append('isProtected', String(isProtected));
    if (isProtected) fd.append('downloadCode', downloadCode.trim());
    fd.append('sendViaLink', String(sendViaLink));
    if (sendViaLink) fd.append('linkExpiresInHours', String(linkExpiresInHours));

    try {
      await filesAPI.upload(fd);
      const n = finalEmails.length;
      toast.success(n > 1 ? `Fichier envoyé à ${n} destinataires !` : 'Fichier envoyé avec succès !');
      router.push('/sent');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const willZip   = files.length > 1;
  const busy      = zipping || loading;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-nfs-100 border border-nfs-border">
          <Upload size={18} className="text-nfs-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-nfs-dark">Envoyer des fichiers</h1>
          <p className="text-xs text-nfs-muted">Chiffrement AES-256 de bout en bout</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-nfs-border rounded-2xl p-6 space-y-5 shadow-lg shadow-nfs-dark/5">

        {/* ── Drop zone ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-nfs-dark">Fichiers</p>
            {files.length > 0 && (
              <button type="button" onClick={clearAll}
                className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Tout supprimer
              </button>
            )}
          </div>

          {/* Zone de dépôt */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              'flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-all duration-200',
              dragging    ? 'border-nfs-primary bg-nfs-100'
              : files.length ? 'border-green-400 bg-green-50'
              : errors.file ? 'border-red-400 bg-red-50'
              : 'border-nfs-border hover:border-nfs-primary/50 bg-nfs-bg',
            ].join(' ')}
          >
            <input ref={inputRef} type="file" multiple className="hidden"
              onChange={(e) => { if (e.target.files.length) addFiles([...e.target.files]); e.target.value = ''; }}
            />
            <Upload size={24} className="text-nfs-primary/50 mb-1.5" />
            <p className="text-sm text-nfs-muted text-center">
              Glissez vos fichiers ou{' '}
              <span className="text-nfs-primary font-medium">parcourez</span>
            </p>
            <p className="text-xs text-nfs-muted/60 mt-1">
              Tous types — max 1 Go au total
              {willZip && ' · les fichiers seront compressés en ZIP'}
            </p>
          </div>
          {errors.file && <p className="text-xs text-red-500 mt-1.5">⚠ {errors.file}</p>}
        </div>

        {/* ── Liste des fichiers sélectionnés ── */}
        {files.length > 0 && (
          <div className="space-y-2">
            {/* Bandeau ZIP si ≥ 2 fichiers */}
            {willZip && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                <Archive size={13} className="shrink-0" />
                <span>
                  <strong>{files.length} fichiers</strong> seront regroupés dans un ZIP avant l&apos;envoi.
                  Taille totale : <strong>{formatFileSize(totalSize)}</strong>
                </span>
              </div>
            )}

            {files.map((f, i) => (
              <div key={`${f.name}-${i}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-nfs-bg border border-nfs-border">
                <FileText size={15} className="text-nfs-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-nfs-dark truncate">{f.name}</p>
                  <p className="text-xs text-nfs-muted">{formatFileSize(f.size)}</p>
                </div>
                <button type="button" onClick={() => removeFile(i)}
                  className="text-nfs-muted hover:text-red-500 transition-colors shrink-0">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Email(s) destinataire(s) ── */}
        <div>
          <p className="text-sm font-medium text-nfs-dark mb-1.5">
            Destinataires
          </p>

          {/* Tags */}
          {recipients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {recipients.map((email) => (
                <span key={email}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-nfs-100 border border-nfs-border text-xs font-medium text-nfs-dark">
                  {email}
                  <button type="button" onClick={() => removeRecipient(email)}
                    className="text-nfs-muted hover:text-red-500 transition-colors">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Champ de saisie + bouton Ajouter */}
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="destinataire@exemple.com"
              value={emailDraft}
              onChange={(e) => { setEmailDraft(e.target.value); setErrors((er) => ({ ...er, recipients: undefined })); }}
              onKeyDown={handleEmailKeyDown}
              onBlur={addEmailFromDraft}
              className={[
                'flex-1 rounded-xl px-3 py-2 text-sm bg-white border focus:outline-none focus:ring-2 transition-colors',
                errors.recipients
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-nfs-border focus:ring-nfs-primary/30',
              ].join(' ')}
            />
            <button type="button" onClick={addEmailFromDraft}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-nfs-100 border border-nfs-border text-xs font-medium text-nfs-dark hover:border-nfs-primary/50 transition-colors shrink-0">
              <UserPlus size={13} /> Ajouter
            </button>
          </div>
          <p className="text-xs text-nfs-muted/70 mt-1">
            Appuyez sur <kbd className="px-1 py-0.5 rounded bg-nfs-bg border border-nfs-border text-[10px]">Entrée</kbd> ou <kbd className="px-1 py-0.5 rounded bg-nfs-bg border border-nfs-border text-[10px]">,</kbd> pour ajouter plusieurs destinataires.
          </p>
          {errors.recipients && <p className="text-xs text-red-500 mt-1">⚠ {errors.recipients}</p>}
        </div>

        {/* ── Envoyer via lien de téléchargement ── */}
        <div>
          <button type="button"
            onClick={() => setSendViaLink((v) => !v)}
            className={[
              'flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full',
              sendViaLink
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-nfs-bg border-nfs-border text-nfs-muted hover:border-nfs-primary/50 hover:text-nfs-dark',
            ].join(' ')}
          >
            <Link2 size={15} />
            {sendViaLink ? 'Envoi via lien de téléchargement' : 'Envoyer via lien de téléchargement'}
            {sendViaLink && <Badge color="blue" className="ml-auto">Actif</Badge>}
          </button>

          {sendViaLink && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-nfs-muted flex items-center gap-1">
                <Clock size={11} /> Durée de validité du lien
              </p>
              <div className="flex flex-wrap gap-2">
                {LINK_DURATIONS.map(({ label, value }) => (
                  <button key={value} type="button"
                    onClick={() => setLinkHours(value)}
                    className={[
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      linkExpiresInHours === value
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-nfs-border text-nfs-muted hover:border-blue-400',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-blue-600/80">
                Le lien sera inclus directement dans l&apos;email du destinataire. Aucun compte requis pour télécharger.
              </p>
            </div>
          )}
        </div>

        {/* ── Protection par code ── */}
        <div>
          <button type="button"
            onClick={() => { setProtected((p) => !p); setCode(''); }}
            className={[
              'flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full',
              isProtected
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-nfs-bg border-nfs-border text-nfs-muted hover:border-nfs-primary/50 hover:text-nfs-dark',
            ].join(' ')}
          >
            {isProtected ? <Lock size={15} /> : <Unlock size={15} />}
            {isProtected ? 'Fichier protégé par code' : 'Ajouter un code de protection'}
            {isProtected && <Badge color="yellow" className="ml-auto">Actif</Badge>}
          </button>

          {isProtected && (
            <div className="mt-3">
              <Input
                label="Code de protection"
                type="password"
                placeholder="Code que le destinataire devra saisir"
                value={downloadCode}
                onChange={(e) => setCode(e.target.value)}
                error={errors.downloadCode}
                hint="Communiquez ce code au destinataire par un autre canal."
              />
            </div>
          )}
        </div>

        {/* ── Bouton envoi ── */}
        <Button type="submit" loading={busy} className="w-full" size="lg">
          {zipping
            ? <><Loader2 size={15} className="animate-spin" /> Compression en cours…</>
            : <><Send size={16} /> {files.length > 1 ? `Zipper et envoyer (${files.length} fichiers)` : 'Envoyer le fichier'}</>
          }
        </Button>
      </form>
    </div>
  );
}

