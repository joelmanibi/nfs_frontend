'use client';

import { useState } from 'react';
import { X, FileBarChart } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

const formatDateTimeInput = (date) => {
  const y   = date.getFullYear();
  const m   = String(date.getMonth() + 1).padStart(2, '0');
  const d   = String(date.getDate()).padStart(2, '0');
  const h   = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
};

const defaultStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return formatDateTimeInput(d);
};

const fieldClass = 'w-full bg-slate-900/60 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500';

export default function UserReportModal({ open, onClose, user }) {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate]     = useState(() => formatDateTimeInput(new Date()));
  const [generating, setGenerating] = useState(false);

  if (!open || !user) return null;

  const handleClose = () => {
    if (generating) return;
    onClose();
  };

  const handleGenerate = async () => {
    if (startDate > endDate) {
      toast.error('La date de début doit être antérieure à la date de fin.');
      return;
    }

    setGenerating(true);
    try {
      const { data } = await adminAPI.getUserStats(user.id, { startDate, endDate });
      const { exportUserReportPDF } = await import('@/lib/exportUserReport');
      exportUserReportPDF(data);
      toast.success('Rapport généré.');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FileBarChart size={18} className="text-blue-400" />
            <h2 className="text-base font-semibold text-white">Rapport PDF</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>

          <p className="text-xs text-slate-400">
            Fichiers envoyés, reçus, volume, taux d&apos;utilisation et types de fichiers pour la période choisie.
          </p>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">Du</label>
            <input type="datetime-local" value={startDate} max={endDate} step="60"
              onChange={(e) => setStartDate(e.target.value)} className={fieldClass} />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">Au</label>
            <input type="datetime-local" value={endDate} min={startDate} max={formatDateTimeInput(new Date())} step="60"
              onChange={(e) => setEndDate(e.target.value)} className={fieldClass} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:text-white transition-all">
              Annuler
            </button>
            <button type="button" onClick={handleGenerate} disabled={generating}
              className="px-4 py-2 rounded-xl text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50">
              {generating ? 'Génération…' : 'Générer le PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
