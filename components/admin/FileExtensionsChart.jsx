'use client';

import { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { adminAPI } from '@/lib/api';

// Palette catégorielle (thème sombre) — on démarre au slot 3 pour ne pas
// entrer en collision visuelle avec le bleu/aqua du graphique d'activité.
const SLICE_COLORS = ['#c98500', '#008300', '#9085e9', '#e66767', '#d55181'];
const OTHER_COLOR   = '#64748b'; // gris neutre — "autres" n'est pas une vraie identité
const SURFACE       = '#1e293b'; // bg-slate-800 — gap entre segments

const colorFor = (extension, index) => (
  extension === 'autres' ? OTHER_COLOR : SLICE_COLORS[index % SLICE_COLORS.length]
);

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm text-white flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.payload.color }} />
        <span className="text-slate-300">.{entry.name}</span>
        <span className="font-semibold ml-auto">{entry.value} ({entry.payload.percent}%)</span>
      </p>
    </div>
  );
}

// Label direct sélectif — uniquement les parts suffisamment grandes (≥ 8%).
function SliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 8) return null;
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

export default function FileExtensionsChart({ startDate, endDate }) {
  const [extensions, setExtensions] = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);

    adminAPI.getStatsExtensions({ startDate, endDate })
      .then(({ data }) => {
        if (cancelled) return;
        setExtensions(data.extensions || []);
        setTotal(data.total || 0);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [startDate, endDate]);

  const data = extensions.map((e, i) => ({
    ...e,
    percent: total > 0 ? Math.round((e.count / total) * 1000) / 10 : 0,
    color: colorFor(e.extension, i),
  }));

  return (
    <div id="chart-file-extensions" className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Répartition par extension</h2>
        <p className="text-sm text-slate-400 mt-0.5">Types de fichiers envoyés sur la période</p>
      </div>

      {error ? (
        <div className="h-72 flex items-center justify-center text-sm text-slate-500">
          Impossible de charger les données.
        </div>
      ) : loading ? (
        <div className="h-72 flex items-center justify-center text-sm text-slate-500">
          Chargement…
        </div>
      ) : total === 0 ? (
        <div className="h-72 flex items-center justify-center text-sm text-slate-500">
          Aucun fichier envoyé sur cette période.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-48 h-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="extension"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke={SURFACE}
                  strokeWidth={2}
                  label={SliceLabel}
                  labelLine={false}
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell key={entry.extension} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-white">{total}</span>
              <span className="text-xs text-slate-400">fichiers</span>
            </div>
          </div>

          {/* Légende — toujours visible pour plusieurs segments */}
          <div className="flex-1 w-full space-y-1.5">
            {data.map((entry) => (
              <div key={entry.extension} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-300">
                  {entry.extension === 'autres' ? 'Autres' : `.${entry.extension}`}
                </span>
                <span className="text-slate-500 ml-auto">{entry.count} · {entry.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
