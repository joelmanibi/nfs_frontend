'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Inbox, Send, Upload, Lock, File } from 'lucide-react';
import { filesAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

function StatCard({ icon: Icon, label, value, color, href }) {
  const content = (
    <div className={`bg-white border border-nfs-border rounded-2xl p-5 hover:shadow-md hover:border-nfs-primary/30 transition-all duration-200 flex items-center gap-4 ${href ? 'cursor-pointer' : ''}`}>
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-nfs-dark">{value ?? '–'}</p>
        <p className="text-sm text-nfs-muted">{label}</p>
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
        <h1 className="text-2xl font-bold text-nfs-dark">
          Bonjour{user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋
        </h1>
        <p className="text-nfs-muted text-sm mt-1">
          Voici un aperçu de votre activité de transfert sécurisé.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Inbox}
          label="Fichiers reçus"
          value={loading ? '…' : inbox?.count}
          color="bg-nfs-100 text-nfs-primary"
          href="/inbox"
        />
        <StatCard
          icon={Send}
          label="Fichiers envoyés"
          value={loading ? '…' : sent?.count}
          color="bg-green-50 text-green-600"
          href="/sent"
        />
        <StatCard
          icon={Lock}
          label="Protégés (reçus)"
          value={loading ? '…' : protectedCount}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={File}
          label="Total échangés"
          value={loading ? '…' : (inbox?.count ?? 0) + (sent?.count ?? 0)}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Recent inbox */}
      {!loading && inbox?.files?.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-nfs-dark">Derniers fichiers reçus</h2>
            <Link href="/inbox">
              <Button variant="ghost" size="sm">Voir tout →</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {inbox.files.slice(0, 3).map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 bg-white border border-nfs-border rounded-xl px-4 py-3 hover:border-nfs-primary/30 transition-all"
              >
                <File size={15} className="text-nfs-primary shrink-0" />
                <p className="text-sm text-nfs-text truncate flex-1">{f.originalName}</p>
                {f.isProtected && (
                  <Lock size={13} className="text-amber-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{background:'linear-gradient(135deg, #005AA1 0%, #00ABDF 100%)'}}>
        <div>
          <h3 className="font-semibold text-white">Envoyer un fichier</h3>
          <p className="text-sm text-white/70 mt-0.5">
            Envoyez un fichier chiffré AES-256 à n&apos;importe quel destinataire.
          </p>
        </div>
        <Link href="/upload">
          <Button size="md" className="bg-white text-nfs-dark hover:bg-nfs-50 shadow-md">
            <Upload size={15} /> Envoyer un fichier
          </Button>
        </Link>
      </section>
    </div>
  );
}

