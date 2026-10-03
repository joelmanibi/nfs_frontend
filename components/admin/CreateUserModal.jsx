'use client';

import { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  organisation: '',
  country: '',
  city: '',
  isInternalUser: false,
};

const fieldClass = 'w-full bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500';
const labelClass = 'block text-xs font-medium text-slate-400 mb-1';

// role : rôle imposé par la hiérarchie (SUPER_ADMIN → ADMIN, ADMIN → USER)
export default function CreateUserModal({ open, onClose, onCreated, role }) {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    if (submitting) return;
    setForm(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminAPI.createUser({ ...form, role });
      toast.success(`${role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'} créé — un email avec son mot de passe lui a été envoyé.`);
      setForm(EMPTY_FORM);
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-blue-400" />
            <h2 className="text-base font-semibold text-white">{role === 'ADMIN' ? 'Créer un administrateur' : 'Créer un utilisateur'}</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-400 -mt-1">
            Le compte est activé immédiatement. Un mot de passe temporaire sera généré et envoyé par email ;
            l&apos;utilisateur devra le changer à sa première connexion.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Prénom *</label>
              <input required className={fieldClass} value={form.firstName} onChange={update('firstName')} />
            </div>
            <div>
              <label className={labelClass}>Nom *</label>
              <input required className={fieldClass} value={form.lastName} onChange={update('lastName')} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email *</label>
            <input required type="email" className={fieldClass} value={form.email} onChange={update('email')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Téléphone *</label>
              <input required className={fieldClass} value={form.phone} onChange={update('phone')} />
            </div>
            <div>
              <label className={labelClass}>Ville</label>
              <input className={fieldClass} value={form.city} onChange={update('city')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Organisation *</label>
              <input required className={fieldClass} value={form.organisation} onChange={update('organisation')} />
            </div>
            <div>
              <label className={labelClass}>Pays *</label>
              <input required className={fieldClass} value={form.country} onChange={update('country')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className={labelClass}>Rôle</label>
              <input className={`${fieldClass} opacity-70 cursor-not-allowed`} value={role || ''} readOnly disabled />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 pb-2">
              <input type="checkbox" checked={form.isInternalUser} onChange={update('isInternalUser')}
                className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-0" />
              Compte interne (AD)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:text-white transition-all">
              Annuler
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 rounded-xl text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50">
              {submitting ? 'Création…' : 'Créer le compte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
