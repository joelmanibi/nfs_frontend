'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import FileActivityChart from './FileActivityChart';
import FileExtensionsChart from './FileExtensionsChart';

const formatDateTimeInput = (date) => {
  const y   = date.getFullYear();
  const m   = String(date.getMonth() + 1).padStart(2, '0');
  const d   = String(date.getDate()).padStart(2, '0');
  const h   = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
};

const dateInputClass = 'bg-slate-900/60 border border-slate-700 text-sm text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-500';

export default function ActivityOverview({ onRangeChange }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29); // 30 derniers jours par défaut
    d.setHours(0, 0, 0, 0);
    return formatDateTimeInput(d);
  });
  const [endDate, setEndDate] = useState(() => formatDateTimeInput(new Date()));

  // Remonte la plage active au parent (ex. pour l'inclure dans un export PDF).
  useEffect(() => { onRangeChange?.({ startDate, endDate }); }, [startDate, endDate, onRangeChange]);

  const handleStartChange = (e) => {
    const value = e.target.value;
    if (value > endDate) {
      toast.error('La date/heure de début doit être antérieure à la date/heure de fin.');
      return;
    }
    setStartDate(value);
  };

  const handleEndChange = (e) => {
    const value = e.target.value;
    if (value < startDate) {
      toast.error('La date/heure de fin doit être postérieure à la date/heure de début.');
      return;
    }
    setEndDate(value);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Du
          <input type="datetime-local" value={startDate} max={endDate} step="60"
            onChange={handleStartChange} className={dateInputClass} />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          au
          <input type="datetime-local" value={endDate} min={startDate} max={formatDateTimeInput(new Date())} step="60"
            onChange={handleEndChange} className={dateInputClass} />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FileActivityChart startDate={startDate} endDate={endDate} />
        <FileExtensionsChart startDate={startDate} endDate={endDate} />
      </div>
    </div>
  );
}
