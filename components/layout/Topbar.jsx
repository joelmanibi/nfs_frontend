'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  LayoutDashboard,
  Inbox,
  Send,
  Upload,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/inbox',     icon: Inbox,           label: 'Boîte de réception' },
  { href: '/sent',      icon: Send,            label: 'Envoyés' },
  { href: '/upload',    icon: Upload,          label: 'Envoyer' },
];

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="md:hidden px-4 py-3 shadow-sm" style={{background:'#005AA1'}}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-wide">NFS</span>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-white/70 hover:text-white transition-colors"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav className="mt-3 pb-2 space-y-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-white text-nfs-dark'
                    : 'text-white/75 hover:text-white hover:bg-white/15',
                ].join(' ')}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </nav>
      )}
    </header>
  );
}

