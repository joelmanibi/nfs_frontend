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
    <header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600">
            <ShieldCheck size={15} className="text-white" />
          </div>
          <span className="text-white font-bold text-base">NFS</span>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav className="mt-3 pb-2 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
                ].join(' ')}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/10 transition-all"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </nav>
      )}
    </header>
  );
}

