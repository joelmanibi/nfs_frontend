'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Search, RefreshCw, Trash2, ShieldCheck, User as UserIcon, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, Building2, Globe, Phone, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/utils';

function RoleBadge({ role }) {
  const cls =
    role === 'SUPER_ADMIN' ? 'bg-amber-500/20 text-amber-400' :
    role === 'ADMIN'       ? 'bg-red-500/20 text-red-400'     :
                             'bg-blue-500/20 text-blue-400';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      <ShieldCheck size={11} />
      {role}
    </span>
  );
}

function TypeBadge({ isInternal }) {
  return isInternal ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
      <Wifi size={10} /> Interne
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-500/30 text-slate-400">
      <WifiOff size={10} /> Externe
    </span>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [tab, setTab]           = useState('approved'); // 'approved' | 'pending'
  const [users, setUsers]       = useState([]);
  const [count, setCount]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [typeFilter, setTypeFilter]   = useState('all'); // 'all' | 'internal' | 'external'
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting]       = useState(null);
  const [updating, setUpdating]       = useState(null);
  const [togglingType, setTogglingType] = useState(null);
  // Pending
  const [pending, setPending]         = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [actioning, setActioning]     = useState(null); // userId being approved/rejected

  const fetchUsers = useCallback(async (p = 1, s = search, tf = typeFilter) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20, search: s };
      if (tf === 'internal') params.isInternal = 'true';
      if (tf === 'external') params.isInternal = 'false';
      const { data } = await adminAPI.getUsers(params);
      setUsers(data.users);
      setCount(data.count);
      setPages(data.pages);
      setPage(p);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const { data } = await adminAPI.getPendingUsers();
      setPending(data.users);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(1, ''); fetchPending(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(draftSearch);
    fetchUsers(1, draftSearch);
  };

  const handleTypeToggle = async (userId, currentValue) => {
    setTogglingType(userId);
    try {
      await adminAPI.updateUser(userId, { isInternalUser: !currentValue });
      toast.success(`Type mis à jour : ${!currentValue ? 'Interne' : 'Externe'}`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isInternalUser: !currentValue } : u));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingType(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId);
    try {
      await adminAPI.updateUser(userId, { role: newRole });
      toast.success('Rôle mis à jour.');
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  const handleApprove = async (userId) => {
    setActioning(userId);
    try {
      await adminAPI.approveUser(userId);
      toast.success('Compte approuvé. L\'utilisateur a été notifié.');
      setPending((prev) => prev.filter((u) => u.id !== userId));
      fetchUsers(page, search);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (userId, email) => {
    if (!confirm(`Rejeter et supprimer le compte ${email} ? Cette action est irréversible.`)) return;
    setActioning(userId);
    try {
      await adminAPI.rejectUser(userId);
      toast.success('Compte rejeté et supprimé.');
      setPending((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActioning(null);
    }
  };

  const handleDelete = async (userId, email) => {
    if (!confirm(`Supprimer le compte ${email} ? Cette action est irréversible.`)) return;
    setDeleting(userId);
    try {
      await adminAPI.deleteUser(userId);
      toast.success('Utilisateur supprimé.');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setCount((c) => c - 1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20">
            <Users size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Utilisateurs</h1>
            <p className="text-xs text-slate-400">{count} compte{count > 1 ? 's' : ''} enregistré{count > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1 w-fit border border-slate-700">
        <button
          onClick={() => setTab('approved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'approved' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Users size={14} /> Comptes actifs
        </button>
        <button
          onClick={() => { setTab('pending'); fetchPending(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white'}`}
        >
          <Clock size={14} /> En attente
          {pending.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
              {pending.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Onglet "En attente" ── */}
      {tab === 'pending' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <p className="text-sm font-medium text-white">Comptes en attente de validation</p>
            <button onClick={fetchPending} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
              <RefreshCw size={14} className={pendingLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          {pendingLoading ? (
            <p className="text-center text-slate-500 py-10 text-sm">Chargement...</p>
          ) : pending.length === 0 ? (
            <p className="text-center text-slate-500 py-10 text-sm">Aucun compte en attente.</p>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {pending.map((u) => (
                <div key={u.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{u.firstName} {u.lastName}</p>
                      <TypeBadge isInternal={u.isInternalUser} />
                    </div>
                    <p className="text-xs text-slate-400">{u.email}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      {u.organisation && <span className="flex items-center gap-1"><Building2 size={10} />{u.organisation}</span>}
                      {u.country && <span className="flex items-center gap-1"><Globe size={10} />{u.country}</span>}
                      {u.phone && <span className="flex items-center gap-1"><Phone size={10} />{u.phone}</span>}
                      <span>Inscrit le {new Date(u.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(u.id)}
                      disabled={actioning === u.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-50 font-medium"
                    >
                      <CheckCircle size={13} /> {actioning === u.id ? '...' : 'Approuver'}
                    </button>
                    <button
                      onClick={() => handleReject(u.id, u.email)}
                      disabled={actioning === u.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50 font-medium"
                    >
                      <XCircle size={13} /> Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet "Comptes actifs" ── */}
      {tab === 'approved' && (<>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filtre Interne / Externe */}
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700">
            {[
              { key: 'all',      label: 'Tous',     icon: Users    },
              { key: 'internal', label: 'Internes', icon: Wifi     },
              { key: 'external', label: 'Externes', icon: WifiOff  },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key}
                onClick={() => { setTypeFilter(key); fetchUsers(1, search, key); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  typeFilter === key
                    ? key === 'internal' ? 'bg-emerald-500/20 text-emerald-400'
                    : key === 'external' ? 'bg-slate-600 text-slate-200'
                    : 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          {/* Recherche + refresh */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Rechercher..." value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-slate-500 w-48" />
              </div>
              <button type="submit" className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-sm transition-all">Chercher</button>
            </form>
            <button onClick={() => fetchUsers(page, search, typeFilter)} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Utilisateur</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Rôle</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Inscrit le</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-10">Chargement...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-10">Aucun utilisateur trouvé.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-slate-400 md:hidden">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleTypeToggle(u.id, u.isInternalUser)}
                      disabled={togglingType === u.id}
                      title="Cliquer pour basculer Interne / Externe"
                      className="disabled:opacity-50 transition-opacity"
                    >
                      <TypeBadge isInternal={u.isInternalUser} />
                    </button>
                    {u.organisation && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Building2 size={10} />{u.organisation}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.id === currentUser?.id ? (
                      <RoleBadge role={u.role} />
                    ) : currentUser?.role === 'SUPER_ADMIN' ? (
                      <select
                        value={u.role}
                        disabled={updating === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-slate-700 border border-slate-600 text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-slate-400"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>
                    ) : (
                      <RoleBadge role={u.role} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                    {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUser?.id && currentUser?.role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleDelete(u.id, u.email)}
                        disabled={deleting === u.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50"
                      >
                        <Trash2 size={12} /> {deleting === u.id ? '...' : 'Supprimer'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 text-sm text-slate-400">
            <span>Page {page} / {pages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchUsers(page - 1, search)} disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-30 transition-all">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => fetchUsers(page + 1, search)} disabled={page >= pages || loading}
                className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-30 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}

