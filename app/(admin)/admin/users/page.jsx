'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Search, RefreshCw, Trash2, ShieldCheck, User as UserIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/utils';

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
      role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
    }`}>
      {role === 'ADMIN' ? <ShieldCheck size={11} /> : <UserIcon size={11} />}
      {role}
    </span>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers]       = useState([]);
  const [count, setCount]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [updating, setUpdating] = useState(null);

  const fetchUsers = useCallback(async (p = 1, s = search) => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsers({ page: p, limit: 20, search: s });
      setUsers(data.users);
      setCount(data.count);
      setPages(data.pages);
      setPage(p);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchUsers(1, ''); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(draftSearch);
    fetchUsers(1, draftSearch);
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
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-slate-500 w-48"
              />
            </div>
            <button type="submit" className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-sm transition-all">
              Chercher
            </button>
          </form>
          <button onClick={() => fetchUsers(page, search)} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all">
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
                <th className="text-left px-4 py-3">Rôle</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Inscrit le</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={5} className="text-center text-slate-500 py-10">Chargement...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-slate-500 py-10">Aucun utilisateur trouvé.</td></tr>
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
                    {u.id === currentUser?.id ? (
                      <RoleBadge role={u.role} />
                    ) : (
                      <select
                        value={u.role}
                        disabled={updating === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-slate-700 border border-slate-600 text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-slate-400"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                    {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUser?.id && (
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
    </div>
  );
}

