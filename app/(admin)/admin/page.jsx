'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, ArrowLeftRight, Link2, HardDrive, FileText, RefreshCw } from 'lucide-react';
import { adminAPI } from '@/lib/api';

function StatCard({ icon: Icon, label, value, color, href, unit }) {
  const content = (
    <div className={`bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-slate-500 transition-all duration-200 flex items-center gap-4 ${href ? 'cursor-pointer' : ''}`}>
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '–'}{unit && value != null ? <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span> : ''}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = Number(bytes);
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

export default function AdminDashboardPage() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getStats();
      setStats(data);
    } catch {
      // handled globally
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vue d&apos;ensemble</h1>
          <p className="text-slate-400 text-sm mt-1">Statistiques globales du système NFS</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users} label="Utilisateurs" color="bg-blue-500/20 text-blue-400"
          value={loading ? '…' : stats?.totalUsers} href="/admin/users"
        />
        <StatCard
          icon={ArrowLeftRight} label="Transferts totaux" color="bg-purple-500/20 text-purple-400"
          value={loading ? '…' : stats?.totalFiles} href="/admin/transfers"
        />
        <StatCard
          icon={Link2} label="Liens actifs" color="bg-emerald-500/20 text-emerald-400"
          value={loading ? '…' : stats?.activeLinks}
        />
        <StatCard
          icon={HardDrive} label="Volume total" color="bg-amber-500/20 text-amber-400"
          value={loading ? '…' : formatSize(stats?.totalSize)}
        />
      </div>

      {/* Quick access cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
        {[
          { href: '/admin/users',     icon: Users,          label: 'Gestion des utilisateurs', desc: 'Modifier les rôles, supprimer des comptes', color: 'text-blue-400' },
          { href: '/admin/transfers', icon: ArrowLeftRight, label: 'Gestion des transferts',    desc: 'Voir et gérer tous les transferts de fichiers', color: 'text-purple-400' },
          { href: '/admin/audit',     icon: FileText,       label: 'Rapport d\'audit',          desc: 'Consulter les logs et événements du système', color: 'text-emerald-400' },
        ].map(({ href, icon: Icon, label, desc, color }) => (
          <Link key={href} href={href}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-slate-500 hover:bg-slate-700/50 transition-all group"
          >
            <Icon size={22} className={`${color} mb-3`} />
            <p className="font-semibold text-white group-hover:text-white">{label}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

