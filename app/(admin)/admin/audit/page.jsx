'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Search, RefreshCw, ChevronDown, ChevronUp, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils';

const LEVEL_STYLES = {
  error: { icon: XCircle,       cls: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  warn:  { icon: AlertCircle,   cls: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  info:  { icon: Info,          cls: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  debug: { icon: CheckCircle,   cls: 'text-slate-400',  bg: 'bg-slate-700/40 border-slate-600' },
};

function LevelBadge({ level }) {
  const { icon: Icon, cls } = LEVEL_STYLES[level] || LEVEL_STYLES.info;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cls}`}>
      <Icon size={12} />
      {(level || 'info').toUpperCase()}
    </span>
  );
}

function LogRow({ entry }) {
  const [open, setOpen] = useState(false);
  const { bg } = LEVEL_STYLES[entry.level] || LEVEL_STYLES.info;
  const meta = { ...entry };
  delete meta.level; delete meta.message; delete meta.timestamp;

  return (
    <div className={`border rounded-xl mb-2 overflow-hidden transition-all ${bg}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        <div className="pt-0.5 shrink-0"><LevelBadge level={entry.level} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-snug break-words">{entry.message}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {entry.timestamp ? new Date(entry.timestamp).toLocaleString('fr-FR') : '—'}
          </p>
        </div>
        {Object.keys(meta).length > 0 && (
          <div className="shrink-0 text-slate-400 mt-0.5">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        )}
      </button>
      {open && Object.keys(meta).length > 0 && (
        <div className="px-4 pb-3">
          <pre className="bg-slate-900 rounded-lg text-xs text-slate-300 p-3 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AdminAuditPage() {
  const [logs, setLogs]         = useState([]);
  const [count, setCount]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [draftFilter, setDraftFilter] = useState('');
  const [limit, setLimit]       = useState(100);

  const fetchLogs = useCallback(async (f = filter, l = limit) => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getAuditLogs({ filter: f, limit: l });
      setLogs(data.logs);
      setCount(data.count);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter, limit]);

  useEffect(() => { fetchLogs('', 100); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilter(draftFilter);
    fetchLogs(draftFilter, limit);
  };

  const handleLimit = (e) => {
    const l = Number(e.target.value);
    setLimit(l);
    fetchLogs(filter, l);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20">
            <FileText size={18} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Rapport d&apos;audit</h1>
            <p className="text-xs text-slate-400">{count} entrée{count > 1 ? 's' : ''} affichée{count > 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrer les logs..."
                value={draftFilter}
                onChange={(e) => setDraftFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-slate-500 w-48"
              />
            </div>
            <button type="submit" className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm transition-all">
              Filtrer
            </button>
          </form>
          <select value={limit} onChange={handleLimit}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-slate-500">
            <option value={50}>50 entrées</option>
            <option value={100}>100 entrées</option>
            <option value={200}>200 entrées</option>
            <option value={500}>500 entrées</option>
          </select>
          <button onClick={() => fetchLogs(filter, limit)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="space-y-0">
        {loading ? (
          <div className="text-center text-slate-500 py-16">Chargement des logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-slate-500 py-16">
            <FileText size={36} className="mx-auto mb-3 opacity-30" />
            <p>Aucun log trouvé{filter ? ' pour ce filtre' : ''}.</p>
          </div>
        ) : (
          logs.map((entry, i) => <LogRow key={i} entry={entry} />)
        )}
      </div>
    </div>
  );
}

