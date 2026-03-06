'use client';

import { useState, useEffect } from 'react';
import { Inbox, Send } from 'lucide-react';
import FileCard from './FileCard';
import Pagination from '@/components/ui/Pagination';

const DEFAULT_PAGE_SIZE = 6;

/**
 * @param {{ files: object[], mode: 'inbox' | 'sent', loading: boolean }} props
 */
export default function FileList({ files = [], mode, loading }) {
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Reset to page 1 whenever the file list or page size changes
  useEffect(() => { setPage(1); }, [files, pageSize]);

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: DEFAULT_PAGE_SIZE }).map((_, i) => (
            <div
              key={i}
              className="bg-nfs-100/60 border border-nfs-border rounded-2xl p-4 animate-pulse h-44"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!files.length) {
    const Icon  = mode === 'inbox' ? Inbox : Send;
    const label = mode === 'inbox'
      ? 'Aucun fichier reçu pour le moment.'
      : 'Aucun fichier envoyé pour le moment.';
    return (
      <div className="flex flex-col items-center justify-center py-20 text-nfs-muted/50">
        <Icon size={40} className="mb-3 opacity-30" />
        <p className="text-sm text-nfs-muted">{label}</p>
      </div>
    );
  }

  // ── Paginated slice ─────────────────────────────────────────────────────────
  const totalPages  = Math.ceil(files.length / pageSize);
  const safePage    = Math.min(page, totalPages);
  const start       = (safePage - 1) * pageSize;
  const visibleFiles = files.slice(start, start + pageSize);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleFiles.map((file) => (
          <FileCard key={file.id} file={file} mode={mode} />
        ))}
      </div>

      <Pagination
        page={safePage}
        pageSize={pageSize}
        total={files.length}
        onPage={setPage}
        onPageSize={setPageSize}
      />
    </div>
  );
}

