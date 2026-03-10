'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({ children }) {
  const { isAuthenticated, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace('/login');
    }
  }, [ready, isAuthenticated, router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-nfs-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-nfs-primary border-t-transparent rounded-full animate-spin" style={{borderWidth:'3px'}} />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-nfs-bg text-nfs-text">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.08]" aria-hidden="true">
            <Image
              src="/logo.png"
              alt=""
              width={640}
              height={640}
              className="h-auto w-[320px] sm:w-[430px] lg:w-[640px]"
            />
          </div>

          <main className="relative z-10 flex-1 p-5 md:p-8 max-w-6xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

