'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Inbox, Send, Upload, Lock, File } from 'lucide-react';
import { filesAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

function StatCard({ icon: Icon, label, value, color, href }) {
  const content = (
    <div className={`bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 hover:border-slate-600 transition-all duration-200 flex items-center gap-4 ${href ? 'cursor-pointer' : ''}`}>
      <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${color} shrink-0`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '–'}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [inbox, setInbox]   = useState(null);
  const [sent, setSent]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([filesAPI.getInbox(), filesAPI.getSent()])
      .then(([inboxRes, sentRes]) => {
        setInbox(inboxRes.data);
        setSent(sentRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const protectedCount = inbox?.files?.filter((f) => f.isProtected).length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Bonjour{user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Voici un aperçu de votre activité de transfert sécurisé.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Inbox}
          label="Fichiers reçus"
          value={loading ? '…' : inbox?.count}
          color="bg-blue-900/40 border border-blue-700/30 text-blue-400"
          href="/inbox"
        />
        <StatCard
          icon={Send}
          label="Fichiers envoyés"
          value={loading ? '…' : sent?.count}
          color="bg-green-900/40 border border-green-700/30 text-green-400"
          href="/sent"
        />
        <StatCard
          icon={Lock}
          label="Protégés (reçus)"
          value={loading ? '…' : protectedCount}
          color="bg-yellow-900/40 border border-yellow-700/30 text-yellow-400"
        />
        <StatCard
          icon={File}
          label="Total échangés"
          value={loading ? '…' : (inbox?.count ?? 0) + (sent?.count ?? 0)}
          color="bg-purple-900/40 border border-purple-700/30 text-purple-400"
        />
      </div>

      {/* Recent inbox */}
      {!loading && inbox?.files?.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-100">Derniers fichiers reçus</h2>
            <Link href="/inbox">
              <Button variant="ghost" size="sm">Voir tout →</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {inbox.files.slice(0, 3).map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/40 rounded-lg px-4 py-3"
              >
                <File size={15} className="text-blue-400 shrink-0" />
                <p className="text-sm text-slate-200 truncate flex-1">{f.originalName}</p>
                {f.isProtected && (
                  <Lock size={13} className="text-yellow-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gradient-to-br from-blue-900/30 to-slate-900 border border-blue-800/40 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white">Envoyer un fichier</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Envoyez un fichier chiffré AES-256 à n&apos;importe quel destinataire.
          </p>
        </div>
        <Link href="/upload">
          <Button size="md">
            <Upload size={15} /> Envoyer un fichier
          </Button>
        </Link>
      </section>
    </div>
  );
}

