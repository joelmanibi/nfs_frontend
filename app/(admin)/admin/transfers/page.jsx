'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeftRight, Link2, Search, RefreshCw, Trash2, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let v = Number(bytes);
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
      active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`}>{children}</button>
  );
}

export default function AdminTransfersPage() {
  const [tab, setTab]           = useState('all');   // 'all' | 'active'
  const [transfers, setTransfers] = useState([]);
  const [activeLinks, setActiveLinks] = useState([]);
  const [count, setCount]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(null);

  const fetchTransfers = useCallback(async (p = 1, s = search) => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getTransfers({ page: p, limit: 20, search: s });
      setTransfers(data.transfers);
      setCount(data.count);
      setPages(data.pages);
      setPage(p);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [search]);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getActiveTransfers();
      setActiveLinks(data.activeLinks);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'all') fetchTransfers(1, '');
    else fetchActive();
  }, [tab]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(draftSearch);
    fetchTransfers(1, draftSearch);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce transfert ? Les liens associés seront aussi supprimés.')) return;
    setDeleting(id);
    try {
      await adminAPI.deleteTransfer(id);
      toast.success('Transfert supprimé.');
      setTransfers((prev) => prev.filter((t) => t.id !== id));
      setActiveLinks((prev) => prev.filter((l) => l.file?.id !== id));
      setCount((c) => c - 1);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20">
            <ArrowLeftRight size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Transferts</h1>
            <p className="text-xs text-slate-400">{tab === 'all' ? `${count} transfert${count > 1 ? 's' : ''} total` : `${activeLinks.length} lien${activeLinks.length > 1 ? 's' : ''} actif${activeLinks.length > 1 ? 's' : ''}`}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'all' && (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Fichier, email..." value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-slate-500 w-44"
                />
              </div>
              <button type="submit" className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm transition-all">Chercher</button>
            </form>
          )}
          <button onClick={() => tab === 'all' ? fetchTransfers(page, search) : fetchActive()}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-700 w-fit">
        <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
          <ArrowLeftRight size={13} className="inline mr-1.5" />Tous les transferts
        </TabButton>
        <TabButton active={tab === 'active'} onClick={() => setTab('active')}>
          <Link2 size={13} className="inline mr-1.5" />Liens actifs
        </TabButton>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'all' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Fichier</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Expéditeur</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Destinataire</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Taille</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr><td colSpan={6} className="text-center text-slate-500 py-10">Chargement...</td></tr>
                ) : transfers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-slate-500 py-10">Aucun transfert trouvé.</td></tr>
                ) : transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white truncate max-w-[160px]">{t.originalName}</p>
                        {t.isProtected && <Lock size={12} className="text-amber-400 shrink-0" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 hidden md:table-cell text-xs">{t.sender?.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 hidden md:table-cell text-xs">{t.receiverEmail}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">{formatSize(t.size)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                      {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50">
                        <Trash2 size={12} />{deleting === t.id ? '...' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Fichier</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Expéditeur</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Destinataire</th>
                  <th className="text-left px-4 py-3">Expire le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr><td colSpan={5} className="text-center text-slate-500 py-10">Chargement...</td></tr>
                ) : activeLinks.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-slate-500 py-10">Aucun lien actif.</td></tr>
                ) : activeLinks.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white truncate max-w-[160px]">{l.file?.originalName || '—'}</p>
                        {l.file?.isProtected && <Lock size={12} className="text-amber-400 shrink-0" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs hidden md:table-cell">{l.file?.sender?.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs hidden md:table-cell">{l.file?.receiverEmail || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-emerald-400 font-medium">
                        {new Date(l.expiresAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {l.file?.id && (
                        <button onClick={() => handleDelete(l.file.id)} disabled={deleting === l.file.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50">
                          <Trash2 size={12} />{deleting === l.file.id ? '...' : 'Supprimer'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {tab === 'all' && pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 text-sm text-slate-400">
            <span>Page {page} / {pages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchTransfers(page - 1, search)} disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-30 transition-all"><ChevronLeft size={16} /></button>
              <button onClick={() => fetchTransfers(page + 1, search)} disabled={page >= pages || loading}
                className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-30 transition-all"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

