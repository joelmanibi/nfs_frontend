'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import {
  Upload, FileText, X, Lock, Unlock, Send,
  Archive, Link2, UserPlus, Clock, MessageSquare,
  CheckCircle2, Loader2, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { filesAPI, usersAPI } from '@/lib/api';
import { formatFileSize, getErrorMessage } from '@/lib/utils';

const LINK_DURATIONS = [
  { label: '1 heure',   value: 1   },
  { label: '6 heures',  value: 6   },
  { label: '24 heures', value: 24  },
  { label: '3 jours',   value: 72  },
  { label: '7 jours',   value: 168 },
  { label: '15 jours',  value: 360 },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_TOTAL_SIZE = 1024 * 1024 * 1024; // 1 Go (taille cumulée)

const UPLOAD_STEPS = [
  { id: 'compress',  label: 'Compression',    threshold: 1   },
  { id: 'transmit',  label: 'Transmission',   threshold: 18  },
  { id: 'antivirus', label: 'Scan antivirus', threshold: 60  },
  { id: 'encrypt',   label: 'Chiffrement',    threshold: 75  },
  { id: 'email',     label: 'Envoi email',    threshold: 87  },
  { id: 'done',      label: 'Terminé',        threshold: 100 },
];

/** Compresse un tableau de File en un seul fichier .zip */
async function buildZip(files, onProgress) {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f);
  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (meta) => onProgress && onProgress(meta.percent),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new File([blob], `envoi_PAA_${date}.zip`, { type: 'application/zip' });
}

export default function UploadPage() {
  const router   = useRouter();
  const inputRef = useRef();

  // ── Fichiers ──
  const [files, setFiles]           = useState([]);
  // ── Destinataires (tags) ──
  const [recipients, setRecipients] = useState([]);
  const [emailDraft, setEmailDraft] = useState('');
  // ── Commentaire ──
  const [comment, setComment]       = useState('');
  // ── Protection ──
  const [isProtected, setProtected] = useState(false);
  const [downloadCode, setCode]     = useState('');
  const [showCode, setShowCode]     = useState(false);
  // ── Lien de téléchargement ──
  const [sendViaLink, setSendViaLink]      = useState(false);
  const [linkExpiresInHours, setLinkHours] = useState(24);
  // ── UI ──
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors]     = useState({});
  // ── Progression multi-étapes ──
  const [progress, setProgress] = useState({ active: false, percent: 0, label: '' });
  const backendTimerRef = useRef(null);
  // ── Autocomplete destinataires ──
  const [suggestions, setSuggestions]   = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSugg, setLoadingSugg]   = useState(false);
  const searchTimerRef = useRef(null);
  const dropdownRef    = useRef(null);

  /* ── Fermer le dropdown au clic extérieur ── */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Recherche de suggestions (DB + AD) avec debounce ── */
  const searchSuggestions = useCallback(async (value) => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setLoadingSugg(true);
    try {
      const { data } = await usersAPI.search(value.trim());
      const filtered = (data.users || []).filter((u) => !recipients.includes(u.email));
      setSuggestions(filtered);
      setShowDropdown(filtered.length > 0);
    } catch {
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoadingSugg(false);
    }
  }, [recipients]);

  /* ── Sélection d'une suggestion ── */
  const selectSuggestion = (user) => {
    if (!recipients.includes(user.email)) {
      setRecipients((prev) => [...prev, user.email]);
    }
    setEmailDraft('');
    setSuggestions([]);
    setShowDropdown(false);
    setErrors((e) => ({ ...e, recipients: undefined }));
  };

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

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmailDraft(val);
    setErrors((er) => ({ ...er, recipients: undefined }));
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchSuggestions(val), 300);
  };

  const handleEmailKeyDown = (ev) => {
    if (ev.key === 'Escape') {
      setShowDropdown(false);
    } else if (ev.key === 'Enter' || ev.key === ',') {
      ev.preventDefault();
      setShowDropdown(false);
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

    setProgress({ active: true, percent: 0, label: 'Préparation…' });

    // ── Phase 1 : Compression (si plusieurs fichiers) ──
    let fileToSend;
    try {
      if (files.length === 1) {
        fileToSend = files[0];
        setProgress({ active: true, percent: 18, label: 'Transmission en cours…' });
      } else {
        setProgress({ active: true, percent: 2, label: 'Compression en cours…' });
        fileToSend = await buildZip(files, (pct) => {
          setProgress({ active: true, percent: Math.max(2, Math.round(pct * 0.16)), label: 'Compression en cours…' });
        });
        setProgress({ active: true, percent: 18, label: 'Transmission en cours…' });
      }
    } catch {
      toast.error('Échec de la compression. Réessayez.');
      setProgress({ active: false, percent: 0, label: '' });
      return;
    }

    // ── Phase 2-5 : Transmission + backend (simulé après envoi des octets) ──
    const fd = new FormData();
    fd.append('file', fileToSend);
    fd.append('receiverEmails', JSON.stringify(finalEmails));
    fd.append('isProtected', String(isProtected));
    if (isProtected) fd.append('downloadCode', downloadCode.trim());
    fd.append('sendViaLink', String(sendViaLink));
    if (sendViaLink) fd.append('linkExpiresInHours', String(linkExpiresInHours));
    if (comment.trim()) fd.append('comment', comment.trim());

    let backendStarted = false;
    const startBackendAnimation = () => {
      if (backendStarted) return;
      backendStarted = true;
      let pct = 60;
      const phases = [
        { label: 'Scan antivirus en cours…', until: 75 },
        { label: 'Chiffrement des données…', until: 87 },
        { label: 'Envoi des notifications email…', until: 97 },
      ];
      let idx = 0;
      backendTimerRef.current = setInterval(() => {
        if (pct >= 97) { clearInterval(backendTimerRef.current); return; }
        pct = Math.min(pct + 0.3, 97);
        while (idx < phases.length - 1 && pct >= phases[idx].until) idx++;
        setProgress({ active: true, percent: Math.round(pct), label: phases[idx].label });
      }, 80);
    };

    try {
      await filesAPI.upload(fd, {
        onUploadProgress: (evt) => {
          const ratio = evt.total ? evt.loaded / evt.total : 1;
          if (ratio >= 0.99) {
            startBackendAnimation();
          } else {
            const mapped = 18 + Math.round(ratio * 42);
            setProgress({ active: true, percent: mapped, label: 'Transmission en cours…' });
          }
        },
      });

      clearInterval(backendTimerRef.current);
      setProgress({ active: true, percent: 100, label: 'Fin de traitement ✓' });
      await new Promise((r) => setTimeout(r, 900));
      const n = finalEmails.length;
      toast.success(n > 1 ? `Fichier envoyé à ${n} destinataires !` : 'Fichier envoyé avec succès !');
      router.push('/sent');
    } catch (err) {
      clearInterval(backendTimerRef.current);
      toast.error(getErrorMessage(err));
    } finally {
      setProgress({ active: false, percent: 0, label: '' });
    }
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const willZip   = files.length > 1;
  const busy      = progress.active;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-NFS-100 border border-NFS-border">
          <Upload size={18} className="text-NFS-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-NFS-dark">Envoyer des fichiers</h1>
          <p className="text-xs text-NFS-muted">Chiffrement de bout en bout</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-NFS-border rounded-2xl p-6 space-y-5 shadow-lg shadow-NFS-dark/5">

        {/* ── Drop zone ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-NFS-dark">Fichiers</p>
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
              dragging    ? 'border-NFS-primary bg-NFS-100'
              : files.length ? 'border-green-400 bg-green-50'
              : errors.file ? 'border-red-400 bg-red-50'
              : 'border-NFS-border hover:border-NFS-primary/50 bg-NFS-bg',
            ].join(' ')}
          >
            <input ref={inputRef} type="file" multiple className="hidden"
              onChange={(e) => { if (e.target.files.length) addFiles([...e.target.files]); e.target.value = ''; }}
            />
            <Upload size={24} className="text-NFS-primary/50 mb-1.5" />
            <p className="text-sm text-NFS-muted text-center">
              Glissez vos fichiers ou{' '}
              <span className="text-NFS-primary font-medium">parcourez</span>
            </p>
            <p className="text-xs text-NFS-muted/60 mt-1">
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-NFS-bg border border-NFS-border">
                <FileText size={15} className="text-NFS-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-NFS-dark truncate">{f.name}</p>
                  <p className="text-xs text-NFS-muted">{formatFileSize(f.size)}</p>
                </div>
                <button type="button" onClick={() => removeFile(i)}
                  className="text-NFS-muted hover:text-red-500 transition-colors shrink-0">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Email(s) destinataire(s) ── */}
        <div>
          <p className="text-sm font-medium text-NFS-dark mb-1.5">
            Destinataires
          </p>

          {/* Tags */}
          {recipients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {recipients.map((email) => (
                <span key={email}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-NFS-100 border border-NFS-border text-xs font-medium text-NFS-dark">
                  {email}
                  <button type="button" onClick={() => removeRecipient(email)}
                    className="text-NFS-muted hover:text-red-500 transition-colors">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Champ de saisie + bouton Ajouter + dropdown autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nom, prénom ou email…"
                value={emailDraft}
                onChange={handleEmailChange}
                onKeyDown={handleEmailKeyDown}
                onBlur={addEmailFromDraft}
                autoComplete="off"
                className={[
                  'flex-1 rounded-xl px-3 py-2 text-sm bg-white border focus:outline-none focus:ring-2 transition-colors',
                  errors.recipients
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-NFS-border focus:ring-NFS-primary/30',
                ].join(' ')}
              />
              <button type="button" onClick={() => { setShowDropdown(false); addEmailFromDraft(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-NFS-100 border border-NFS-border text-xs font-medium text-NFS-dark hover:border-NFS-primary/50 transition-colors shrink-0">
                <UserPlus size={13} /> Ajouter
              </button>
            </div>

            {/* Dropdown suggestions */}
            {(showDropdown || loadingSugg) && (
              <div className="absolute top-full left-0 right-10 mt-1 bg-white border border-NFS-border rounded-xl shadow-lg z-50 overflow-hidden">
                {loadingSugg ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-NFS-muted">
                    <Loader2 size={12} className="animate-spin" /> Recherche en cours…
                  </div>
                ) : (
                  suggestions.map((user) => (
                    <button
                      key={user.email}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectSuggestion(user); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-NFS-100 transition-colors text-left border-b border-NFS-border/40 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-NFS-dark truncate">{user.label}</p>
                        <p className="text-xs text-NFS-muted truncate">{user.email}</p>
                      </div>
                      <span className={[
                        'shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium border',
                        user.isInternalUser
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200',
                      ].join(' ')}>
                        {user.source === 'ldap' ? '🏢 AD' : user.isInternalUser ? 'Interne' : 'Externe'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-NFS-muted/70 mt-1">
            Tapez un nom ou un email — sélectionnez dans la liste ou appuyez sur <kbd className="px-1 py-0.5 rounded bg-NFS-bg border border-NFS-border text-[10px]">Entrée</kbd>.
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
                : 'bg-NFS-bg border-NFS-border text-NFS-muted hover:border-NFS-primary/50 hover:text-NFS-dark',
            ].join(' ')}
          >
            <Link2 size={15} />
            {sendViaLink ? 'Envoi via lien de téléchargement' : 'Envoyer via lien de téléchargement'}
            {sendViaLink && <Badge color="blue" className="ml-auto">Actif</Badge>}
          </button>

          {sendViaLink && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-NFS-muted flex items-center gap-1">
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
                        : 'bg-white border-NFS-border text-NFS-muted hover:border-blue-400',
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
                : 'bg-NFS-bg border-NFS-border text-NFS-muted hover:border-NFS-primary/50 hover:text-NFS-dark',
            ].join(' ')}
          >
            {isProtected ? <Lock size={15} /> : <Unlock size={15} />}
            {isProtected ? 'Fichier protégé par code' : 'Ajouter un code de protection'}
            {isProtected && <Badge color="yellow" className="ml-auto">Actif</Badge>}
          </button>

          {isProtected && (
            <div className="mt-3 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-NFS-dark">Code de protection</label>
              <div className="relative">
                <input
                  type={showCode ? 'text' : 'password'}
                  placeholder="Code que le destinataire devra saisir"
                  value={downloadCode}
                  onChange={(e) => setCode(e.target.value)}
                  className={[
                    'w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm',
                    'bg-white border text-NFS-text placeholder-NFS-muted',
                    'transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-NFS-primary focus:border-NFS-primary',
                    errors.downloadCode
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-NFS-border hover:border-NFS-primary/50',
                  ].join(' ')}
                />
                <button
                  type="button"
                  onClick={() => setShowCode((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-NFS-muted hover:text-NFS-dark transition-colors"
                >
                  {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.downloadCode && (
                <p className="text-xs text-red-500 flex items-center gap-1"><span>⚠</span> {errors.downloadCode}</p>
              )}
              <p className="text-xs text-NFS-muted">Communiquez ce code au destinataire par un autre canal.</p>
            </div>
          )}
        </div>

        {/* ── Commentaire (optionnel) ── */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-NFS-dark mb-1.5">
            <MessageSquare size={14} className="text-NFS-primary/70" />
            Commentaire
            <span className="text-xs font-normal text-NFS-muted">(optionnel)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Ajoutez un message ou des informations complémentaires pour le destinataire…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={busy}
            className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-NFS-border focus:outline-none focus:ring-2 focus:ring-NFS-primary/30 resize-none transition-colors disabled:opacity-50"
          />
        </div>

        {/* ── Barre de progression multi-étapes ── */}
        {progress.active && (
          <div className="rounded-xl border border-NFS-border bg-NFS-bg p-4 space-y-3">
            {/* Label + pourcentage */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-NFS-dark flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-NFS-primary" />
                {progress.label}
              </span>
              <span className="text-sm font-bold text-NFS-primary tabular-nums">
                {progress.percent}%
              </span>
            </div>

            {/* Barre de progression */}
            <div className="h-2.5 w-full rounded-full bg-NFS-border overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-NFS-primary to-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {/* Étapes */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              {UPLOAD_STEPS.filter((s) => s.id !== 'done').map((step) => {
                const done    = progress.percent >= step.threshold + 14;
                const active  = progress.percent >= step.threshold && !done;
                return (
                  <div key={step.id}
                    className={[
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all',
                      done   ? 'bg-green-50 border border-green-200 text-green-700'
                      : active ? 'bg-NFS-100 border border-NFS-primary/30 text-NFS-primary font-medium'
                      : 'bg-white border border-NFS-border text-NFS-muted/60',
                    ].join(' ')}
                  >
                    {done
                      ? <CheckCircle2 size={11} className="shrink-0 text-green-600" />
                      : active
                        ? <Loader2 size={11} className="shrink-0 animate-spin" />
                        : <span className="w-[11px] h-[11px] shrink-0 rounded-full border border-current opacity-40" />
                    }
                    {step.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Bouton envoi ── */}
        <Button type="submit" loading={busy} className="w-full" size="lg">
          {busy
            ? <><Loader2 size={15} className="animate-spin" /> {progress.label || 'Traitement en cours…'}</>
            : <><Send size={16} /> {files.length > 1 ? `Zipper et envoyer (${files.length} fichiers)` : 'Envoyer le fichier'}</>
          }
        </Button>
      </form>
    </div>
  );
}

