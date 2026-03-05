'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  Send,
  Upload,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/inbox',     icon: Inbox,           label: 'Boîte de réception' },
  { href: '/sent',      icon: Send,            label: 'Fichiers envoyés' },
  { href: '/upload',    icon: Upload,          label: 'Envoyer un fichier' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-slate-900 border-r border-slate-800 min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
          <ShieldCheck size={18} className="text-white" />
        </div>
        <span className="text-white font-bold tracking-tight text-lg">NFS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
              ].join(' ')}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-700 text-white text-xs font-bold shrink-0">
            {getInitials(`${user?.email || 'U'}`)}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-slate-200 truncate">{user?.email}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/10 transition-all"
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

