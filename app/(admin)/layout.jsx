'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, ArrowLeftRight, FileText,
  LogOut, ShieldCheck, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ADMIN_NAV = [
  { href: '/admin',           icon: LayoutDashboard, label: 'Vue d\'ensemble' },
  { href: '/admin/users',     icon: Users,           label: 'Utilisateurs' },
  { href: '/admin/transfers', icon: ArrowLeftRight,  label: 'Transferts' },
  { href: '/admin/audit',     icon: FileText,        label: 'Rapport d\'audit' },
];

function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 min-h-screen bg-slate-900">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/20">
          <ShieldCheck size={20} className="text-red-400" />
        </div>
        <div>
          <span className="text-white font-bold tracking-wide text-lg leading-none">Admin</span>
          <p className="text-white/50 text-xs leading-none mt-0.5">NFS — Panneau admin</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {ADMIN_NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-red-500 text-white shadow-md'
                  : 'text-white/65 hover:text-white hover:bg-white/10',
              ].join(' ')}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all mb-1"
        >
          <ChevronRight size={15} className="rotate-180" />
          Retour au dashboard
        </Link>
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 text-red-400 text-xs font-bold shrink-0">
            {user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">{user?.email}</p>
            <p className="text-xs text-red-400 font-medium">Administrateur</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role !== 'ADMIN') { router.replace('/dashboard'); }
  }, [ready, isAuthenticated, user, router]);

  if (!ready || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-red-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]" aria-hidden="true">
            <Image src="/logo.png" alt="" width={640} height={640} className="h-auto w-[640px]" />
          </div>
          <main className="relative z-10 flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

