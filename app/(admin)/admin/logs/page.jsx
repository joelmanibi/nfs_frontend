'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Terminal, RefreshCw, Search, X, ChevronDown, ChevronUp, XCircle, AlertCircle, Info, Bug,
  Activity, CheckCircle2, MinusCircle, Copy, Download, Server, ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const LEVELS = [
  { key: 'error', label: 'Erreurs',        icon: XCircle,     cls: 'text-red-400',   chip: 'bg-red-500/20 text-red-400 border-red-500/30',       row: 'border-l-red-500' },
  { key: 'warn',  label: 'Avertissements', icon: AlertCircle, cls: 'text-amber-400', chip: 'bg-amber-500/20 text-amber-400 border-amber-500/30', row: 'border-l-amber-500' },
  { key: 'info',  label: 'Info',           icon: Info,        cls: 'text-blue-400',  chip: 'bg-blue-500/20 text-blue-400 border-blue-500/30',    row: 'border-l-blue-500/40' },
  { key: 'debug', label: 'Debug',          icon: Bug,         cls: 'text-slate-400', chip: 'bg-slate-600/40 text-slate-300 border-slate-500/40', row: 'border-l-slate-600' },
];
const LEVEL_BY_KEY = Object.fromEntries(LEVELS.map((l) => [l.key, l]));

const PAGE_SIZE = 200;
const AUTO_REFRESH_MS = 30000;

// Champs déjà affichés dans l'en-tête d'une entrée — exclus du bloc "contexte"
const HEADER_FIELDS = new Set(['timestamp', 'level', 'message', 'event', 'error', 'errorInfo', 'stack', 'service']);

function LevelBadge({ level }) {
  const l = LEVEL_BY_KEY[level] || LEVEL_BY_KEY.info;
  const Icon = l.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase ${l.cls}`}>
      <Icon size={12} /> {level}
    </span>
  );
}

const copy = async (text, label = 'Copié') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error('Copie impossible');
  }
};

// ── Carte d'état d'un service (résultat du test de connectivité) ─────────────
function ServiceCard({ result }) {
  const ok = result.status === 'OK';
  const off = result.status === 'DISABLED';
  const Icon = ok ? CheckCircle2 : off ? MinusCircle : XCircle;
  const tone = ok
    ? 'border-emerald-500/30 bg-emerald-500/5'
    : off ? 'border-slate-700 bg-slate-800/60' : 'border-red-500/40 bg-red-500/10';
  const iconCls = ok ? 'text-emerald-400' : off ? 'text-slate-500' : 'text-red-400';

  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white truncate">{result.label}</p>
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${iconCls}`}>
          <Icon size={13} /> {ok ? 'OK' : off ? 'Désactivé' : 'ÉCHEC'}
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-1 font-mono break-all">{result.target}</p>
      {result.durationMs != null && <p className="text-[11px] text-slate-500 mt-0.5">{result.durationMs} ms</p>}
      {!ok && !off && (
        <div className="mt-2 text-xs">
          <p className="text-red-300 break-words">{result.error}</p>
          {result.errorInfo && (
            <p className="text-red-400/80 font-mono mt-1 break-all">
              {Object.entries(result.errorInfo).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Entrée de journal dépliable ──────────────────────────────────────────────
function LogEntry({ entry }) {
  const [open, setOpen] = useState(false);
  const level = LEVEL_BY_KEY[entry.level] || LEVEL_BY_KEY.info;
  const { data } = entry;
  const context = Object.fromEntries(Object.entries(data).filter(([k]) => !HEADER_FIELDS.has(k)));

  return (
    <div className={`border-l-4 ${level.row} bg-slate-800 border-y border-r border-slate-700/60 rounded-r-lg`}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-700/30 transition-colors">
        <span className="text-[11px] text-slate-400 font-mono shrink-0 pt-0.5 w-[132px]">{entry.timestamp || '—'}</span>
        <span className="shrink-0 w-[62px] pt-0.5"><LevelBadge level={entry.level} /></span>
        <span className="shrink-0 hidden md:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 whitespace-nowrap">{entry.componentLabel}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white break-words">{entry.message}</p>
          <div className="flex flex-wrap gap-x-3 text-[11px] mt-0.5">
            {entry.event && <span className="text-slate-500 font-mono">{entry.event}</span>}
            {entry.error && <span className="text-red-300 break-all">{entry.error}</span>}
            {data.errorInfo?.code && <span className="text-red-400 font-mono">[{data.errorInfo.code}]</span>}
          </div>
        </div>
        <span className="text-slate-500 shrink-0 pt-0.5">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {data.errorInfo && (
            <div>
              <p className="text-[11px] font-semibold text-red-400 uppercase mb-1">Détail de l&apos;erreur</p>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 bg-red-950/30 border border-red-500/20 rounded-lg p-2 text-xs">
                {Object.entries(data.errorInfo).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-red-300/80 font-mono">{k}</dt>
                    <dd className="text-red-100 font-mono break-all whitespace-pre-wrap">{typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {data.stack && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Pile d&apos;appels</p>
              <pre className="bg-slate-950 rounded-lg text-[11px] text-slate-300 p-2 overflow-x-auto whitespace-pre">{data.stack}</pre>
            </div>
          )}
          {Object.keys(context).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Contexte</p>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 bg-slate-900 rounded-lg p-2 text-xs">
                {Object.entries(context).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-slate-500 font-mono">{k}</dt>
                    <dd className="text-slate-200 font-mono break-all whitespace-pre-wrap">{typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <button onClick={() => copy(JSON.stringify(data, null, 2), 'Entrée copiée (JSON)')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-700 text-slate-300 hover:text-white transition-all">
            <Copy size={12} /> Copier l&apos;entrée complète (JSON)
          </button>
        </div>
      )}
    </div>
  );
}

const EMPTY_FILTERS = { levels: ['error', 'warn'], component: '', search: '', from: '', to: '' };

export default function AdminLogsPage() {
  const { user } = useAuth();
  const [filters, setFilters]       = useState(EMPTY_FILTERS);
  const [draftSearch, setDraftSearch] = useState('');
  const [entries, setEntries]       = useState([]);
  const [nextBefore, setNextBefore] = useState(null);
  const [components, setComponents] = useState({});
  const [scanLimited, setScanLimited] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [summary, setSummary]       = useState(null);
  const [health, setHealth]         = useState(null);
  const [checking, setChecking]     = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const buildParams = (f, before) => {
    const params = { limit: PAGE_SIZE };
    if (f.levels.length) params.level = f.levels.join(',');
    if (f.component) params.component = f.component;
    if (f.search) params.search = f.search;
    if (f.from) params.from = f.from;
    if (f.to) params.to = f.to;
    if (before != null) params.before = before;
    return params;
  };

  const fetchLogs = useCallback(async (f = filtersRef.current, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await adminAPI.getLogs(buildParams(f));
      setEntries(data.entries);
      setNextBefore(data.nextBefore);
      setScanLimited(data.scanLimited);
      setComponents(data.components || {});
    } catch (err) {
      if (!silent) toast.error(getErrorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await adminAPI.getLogsSummary({ hours: 24 });
      setSummary(data);
    } catch {
      // synthèse indicative
    }
  }, []);

  const loadMore = async () => {
    if (nextBefore == null) return;
    setLoadingMore(true);
    try {
      const { data } = await adminAPI.getLogs(buildParams(filters, nextBefore));
      setEntries((prev) => [...prev, ...data.entries]);
      setNextBefore(data.nextBefore);
      setScanLimited(data.scanLimited);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const { data } = await adminAPI.runHealthCheck();
      setHealth(data);
      const failed = data.results.filter((r) => r.status === 'FAILED');
      if (failed.length) toast.error(`${failed.length} service(s) en échec : ${failed.map((r) => r.label).join(', ')}`);
      else toast.success('Tous les services actifs répondent.');
      fetchLogs();
      fetchSummary();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    fetchLogs(EMPTY_FILTERS);
    fetchSummary();
  }, [user?.role, fetchLogs, fetchSummary]);

  // Rafraîchissement automatique (première page uniquement)
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => { fetchLogs(filtersRef.current, { silent: true }); fetchSummary(); }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, fetchLogs, fetchSummary]);

  const applyFilters = (patch) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    fetchLogs(next);
  };

  const toggleLevel = (key) => {
    const levels = filters.levels.includes(key) ? filters.levels.filter((l) => l !== key) : [...filters.levels, key];
    applyFilters({ levels });
  };

  const resetFilters = () => {
    setDraftSearch('');
    setFilters(EMPTY_FILTERS);
    fetchLogs(EMPTY_FILTERS);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries.map((e) => e.data), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journaux-nfs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (user && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <ShieldAlert size={32} className="text-red-400" />
        <p className="text-white font-semibold">Accès réservé au Super Administrateur.</p>
      </div>
    );
  }

  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20">
            <Terminal size={18} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Journaux techniques</h1>
            <p className="text-xs text-slate-400">Diagnostic des services (AD, SMTP, base de données, Redis, antivirus, collectes) et des erreurs applicatives</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={runHealthCheck} disabled={checking}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all disabled:opacity-60">
            <Activity size={14} className={checking ? 'animate-pulse' : ''} />
            {checking ? 'Test en cours…' : 'Tester les services'}
          </button>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-0" />
            Auto (30 s)
          </label>
          <button onClick={exportJson} disabled={!entries.length} title="Exporter les entrées affichées"
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-40">
            <Download size={14} />
          </button>
          <button onClick={() => { fetchLogs(); fetchSummary(); }} title="Rafraîchir"
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* État des services (après test) */}
      {health && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Server size={14} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-white">État des services</h2>
            <span className="text-xs text-slate-500">testé le {new Date(health.checkedAt).toLocaleString('fr-FR')}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {health.results.map((r) => <ServiceCard key={r.service + r.label} result={r} />)}
          </div>
        </section>
      )}

      {/* Synthèse 24 h */}
      {summary && (
        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h2 className="text-sm font-semibold text-white">Dernières 24 h</h2>
            <p className="text-xs">
              <span className="text-red-400 font-semibold">{summary.totals.error} erreur{summary.totals.error > 1 ? 's' : ''}</span>
              <span className="text-slate-500"> · </span>
              <span className="text-amber-400 font-semibold">{summary.totals.warn} avertissement{summary.totals.warn > 1 ? 's' : ''}</span>
            </p>
          </div>
          {summary.components.length === 0 ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={13} /> Aucune erreur ni avertissement.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {summary.components.map((c) => (
                <button key={c.component}
                  onClick={() => applyFilters({ component: c.component, levels: ['error', 'warn'] })}
                  title={c.lastError ? `Dernière erreur (${c.lastError.timestamp}) : ${c.lastError.error || c.lastError.message}` : undefined}
                  className={`text-left px-3 py-2 rounded-xl border text-xs transition-all hover:brightness-125 ${
                    filters.component === c.component ? 'ring-1 ring-white/40' : ''
                  } ${c.error ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                  <p className="text-white font-medium">{c.label}</p>
                  <p>
                    {c.error > 0 && <span className="text-red-400">{c.error} err.</span>}
                    {c.error > 0 && c.warn > 0 && <span className="text-slate-500"> · </span>}
                    {c.warn > 0 && <span className="text-amber-400">{c.warn} avert.</span>}
                  </p>
                  {c.lastError && <p className="text-slate-400 max-w-[260px] truncate">{c.lastError.error || c.lastError.message}</p>}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Filtres */}
      <section className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700">
          {LEVELS.map(({ key, label, icon: Icon, chip }) => {
            const active = filters.levels.includes(key);
            return (
              <button key={key} onClick={() => toggleLevel(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active ? chip : 'border-transparent text-slate-400 hover:text-white'
                }`}>
                <Icon size={12} /> {label}
              </button>
            );
          })}
        </div>

        <select value={filters.component} onChange={(e) => applyFilters({ component: e.target.value })}
          className="bg-slate-800 border border-slate-700 text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-slate-500">
          <option value="">Tous les services</option>
          {Object.entries(components).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>

        <form onSubmit={(e) => { e.preventDefault(); applyFilters({ search: draftSearch.trim() }); }} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)}
            placeholder="Rechercher (email, IP, code, fileId…)"
            className="bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-slate-500 w-64" />
        </form>

        <label className="text-xs text-slate-400">
          Du
          <input type="datetime-local" value={filters.from} onChange={(e) => applyFilters({ from: e.target.value })}
            className="block mt-1 bg-slate-800 border border-slate-700 text-sm text-white rounded-xl px-2 py-1.5 focus:outline-none focus:border-slate-500 [color-scheme:dark]" />
        </label>
        <label className="text-xs text-slate-400">
          Au
          <input type="datetime-local" value={filters.to} onChange={(e) => applyFilters({ to: e.target.value })}
            className="block mt-1 bg-slate-800 border border-slate-700 text-sm text-white rounded-xl px-2 py-1.5 focus:outline-none focus:border-slate-500 [color-scheme:dark]" />
        </label>

        {hasFilters && (
          <button onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm transition-all">
            <X size={13} /> Réinitialiser
          </button>
        )}
      </section>

      {/* Liste */}
      <section className="space-y-1.5">
        <p className="text-xs text-slate-500">
          {entries.length} entrée{entries.length > 1 ? 's' : ''} affichée{entries.length > 1 ? 's' : ''}, de la plus récente à la plus ancienne. Cliquez sur une entrée pour voir le détail (code d&apos;erreur, hôte, pile d&apos;appels, contexte).
          {' '}Les secrets (mots de passe, cookies…) sont masqués.
        </p>
        {loading ? (
          <p className="text-center text-slate-500 py-10 text-sm">Chargement…</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-slate-500 py-10 text-sm">Aucune entrée pour ces filtres.</p>
        ) : (
          entries.map((e) => <LogEntry key={e.id} entry={e} />)
        )}

        {!loading && nextBefore != null && (
          <div className="text-center pt-3">
            <button onClick={loadMore} disabled={loadingMore}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm transition-all disabled:opacity-50">
              {loadingMore ? 'Chargement…' : 'Charger les entrées plus anciennes'}
            </button>
            {scanLimited && (
              <p className="text-[11px] text-slate-500 mt-1">Recherche limitée à une portion du fichier par requête — continuez pour remonter plus loin.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
