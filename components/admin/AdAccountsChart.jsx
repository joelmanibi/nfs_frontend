'use client';

import { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { adminAPI } from '@/lib/api';

// Slots catégoriels distincts des deux autres graphiques de la page.
const COLOR_AD       = '#3987e5'; // slot 1 — bleu
const COLOR_EXTERNAL = '#d95926'; // slot 8 — orange
const SURFACE        = '#1e293b'; // bg-slate-800 — gap entre segments

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm text-white flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.payload.color }} />
        <span className="text-slate-300">{entry.name}</span>
        <span className="font-semibold ml-auto">{entry.value} ({entry.payload.percent}%)</span>
      </p>
    </div>
  );
}

function SliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${percent}%`}
    </text>
  );
}

export default function AdAccountsChart() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let cancelled = false;

    adminAPI.getStats()
      .then(({ data }) => { if (!cancelled) setStats(data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const total = stats ? stats.internalUsers + stats.externalUsers : 0;
  const data = stats && total > 0 ? [
    {
      name: 'Comptes AD',
      count: stats.internalUsers,
      percent: Math.round((stats.internalUsers / total) * 1000) / 10,
      color: COLOR_AD,
    },
    {
      name: 'Comptes externes',
      count: stats.externalUsers,
      percent: Math.round((stats.externalUsers / total) * 1000) / 10,
      color: COLOR_EXTERNAL,
    },
  ] : [];

  return (
    <div id="chart-ad-accounts" className="bg-slate-800 border border-slate-700 rounded-2xl p-5 lg:max-w-md">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Comptes Active Directory</h2>
        <p className="text-sm text-slate-400 mt-0.5">Part des comptes utilisant l&apos;authentification AD</p>
      </div>

      {error ? (
        <div className="h-48 flex items-center justify-center text-sm text-slate-500">
          Impossible de charger les données.
        </div>
      ) : loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-slate-500">
          Chargement…
        </div>
      ) : total === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-slate-500">
          Aucun compte enregistré.
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative w-40 h-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke={SURFACE}
                  strokeWidth={2}
                  label={SliceLabel}
                  labelLine={false}
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-white">{total}</span>
              <span className="text-xs text-slate-400">comptes</span>
            </div>
          </div>

          {/* Légende — toujours visible pour 2 segments */}
          <div className="flex-1 space-y-1.5">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-300">{entry.name}</span>
                <span className="text-slate-500 ml-auto">{entry.count} · {entry.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
