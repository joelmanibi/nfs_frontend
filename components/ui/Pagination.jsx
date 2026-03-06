'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES = [6, 12, 24];

/**
 * Build the page number array with ellipsis markers.
 * e.g. [1, '…', 4, 5, 6, '…', 12]
 */
function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current]);
  for (let d = -1; d <= 1; d++) {
    const p = current + d;
    if (p > 1 && p < total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('…');
    result.push(p);
  });
  return result;
}

/**
 * @param {{
 *   page: number,
 *   pageSize: number,
 *   total: number,
 *   onPage: (p: number) => void,
 *   onPageSize: (ps: number) => void,
 * }} props
 */
export default function Pagination({ page, pageSize, total, onPage, onPageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  if (total === 0) return null;

  const pages = buildPages(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      {/* Counter */}
      <p className="text-xs text-nfs-muted shrink-0">
        <span className="text-nfs-dark font-medium">{from}–{to}</span> sur{' '}
        <span className="text-nfs-dark font-medium">{total}</span> résultat{total > 1 ? 's' : ''}
      </p>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        {/* Page size selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-nfs-muted hidden sm:inline">Par page :</span>
          <select
            value={pageSize}
            onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
            className="bg-white border border-nfs-border text-nfs-text text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-nfs-primary cursor-pointer"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Prev */}
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-nfs-border bg-white text-nfs-muted hover:text-nfs-dark hover:border-nfs-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Page précédente"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="text-nfs-muted text-xs px-0.5">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={[
                'flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium border transition-all',
                p === page
                  ? 'bg-nfs-primary border-nfs-primary text-white shadow-sm shadow-nfs-primary/30'
                  : 'bg-white border-nfs-border text-nfs-muted hover:text-nfs-dark hover:border-nfs-primary',
              ].join(' ')}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-nfs-border bg-white text-nfs-muted hover:text-nfs-dark hover:border-nfs-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Page suivante"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

