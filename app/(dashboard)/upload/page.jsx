'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  X,
  Lock,
  Unlock,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { filesAPI } from '@/lib/api';
import { formatFileSize, getErrorMessage } from '@/lib/utils';

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip,.rar';
const MAX_SIZE  = 10 * 1024 * 1024; // 10 MB

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef();

  const [file, setFile]             = useState(null);
  const [receiverEmail, setReceiver] = useState('');
  const [isProtected, setProtected]  = useState(false);
  const [downloadCode, setCode]      = useState('');
  const [dragging, setDragging]      = useState(false);
  const [loading, setLoading]        = useState(false);
  const [errors, setErrors]          = useState({});

  const validate = () => {
    const e = {};
    if (!file) e.file = 'Veuillez sélectionner un fichier.';
    if (!receiverEmail.trim()) e.receiverEmail = 'Email du destinataire requis.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiverEmail)) e.receiverEmail = 'Email invalide.';
    if (isProtected && !downloadCode.trim()) e.downloadCode = 'Code de protection requis.';
    return e;
  };

  const pickFile = (f) => {
    if (!f) return;
    if (f.size > MAX_SIZE) { toast.error('Fichier trop volumineux (max 10 MB).'); return; }
    setFile(f);
    setErrors((e) => ({ ...e, file: undefined }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('receiverEmail', receiverEmail.trim().toLowerCase());
    fd.append('isProtected', String(isProtected));
    if (isProtected) fd.append('downloadCode', downloadCode.trim());

    try {
      await filesAPI.upload(fd);
      toast.success('Fichier envoyé avec succès !');
      router.push('/sent');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-nfs-100 border border-nfs-border">
          <Upload size={18} className="text-nfs-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-nfs-dark">Envoyer un fichier</h1>
          <p className="text-xs text-nfs-muted">Chiffrement AES-256 de bout en bout</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-nfs-border rounded-2xl p-6 space-y-5 shadow-lg shadow-nfs-dark/5">
        {/* Drop zone */}
        <div>
          <p className="text-sm font-medium text-nfs-dark mb-1.5">Fichier</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              'relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-10 px-4 cursor-pointer transition-all duration-200',
              dragging
                ? 'border-nfs-primary bg-nfs-100'
                : file
                ? 'border-green-400 bg-green-50'
                : errors.file
                ? 'border-red-400 bg-red-50'
                : 'border-nfs-border hover:border-nfs-primary/50 bg-nfs-bg',
            ].join(' ')}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => pickFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex items-center gap-3">
                <FileText size={22} className="text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-nfs-dark">{file.name}</p>
                  <p className="text-xs text-nfs-muted">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ml-2 text-nfs-muted hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} className="text-nfs-primary/50 mb-2" />
                <p className="text-sm text-nfs-muted">Glissez un fichier ou <span className="text-nfs-primary font-medium">parcourez</span></p>
                <p className="text-xs text-nfs-muted/60 mt-1">PDF, Word, Excel, Images, ZIP — max 10 MB</p>
              </>
            )}
          </div>
          {errors.file && <p className="text-xs text-red-500 mt-1.5">⚠ {errors.file}</p>}
        </div>

        <Input
          label="Email du destinataire"
          type="email"
          placeholder="destinataire@exemple.com"
          value={receiverEmail}
          onChange={(e) => setReceiver(e.target.value)}
          error={errors.receiverEmail}
          required
        />

        {/* Protection toggle */}
        <div>
          <button
            type="button"
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

        <Button type="submit" loading={loading} className="w-full" size="lg">
          <Send size={16} /> Envoyer le fichier
        </Button>
      </form>
    </div>
  );
}

