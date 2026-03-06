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
    <aside className="hidden md:flex flex-col w-64 shrink-0 min-h-screen" style={{background:'#005AA1'}}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{borderBottom:'1px solid rgba(255,255,255,0.15)'}}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <span className="text-white font-bold tracking-wide text-lg leading-none">NFS</span>
          <p className="text-white/60 text-xs leading-none mt-0.5">Transfert sécurisé</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-white text-nfs-dark shadow-md'
                  : 'text-white/75 hover:text-white hover:bg-white/15',
              ].join(' ')}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4" style={{borderTop:'1px solid rgba(255,255,255,0.15)'}}>
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-nfs-primary text-white text-xs font-bold shrink-0 shadow-md">
            {getInitials(`${user?.email || 'U'}`)}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">{user?.email}</p>
            <p className="text-xs text-white/50 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

