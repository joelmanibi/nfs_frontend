'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { adminAPI } from '@/lib/api';

// Palette catégorielle (thème sombre) — slot 1 bleu, slot 2 aqua.
const COLOR_SENT     = '#3987e5';
const COLOR_RECEIVED = '#199e70';

function formatDateShort(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-slate-400 mb-1.5">{formatDateShort(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-300">{entry.name}</span>
          <span className="font-semibold ml-auto">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function FileActivityChart({ startDate, endDate }) {
  const [series, setSeries]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);

    adminAPI.getStatsTimeseries({ startDate, endDate })
      .then(({ data }) => { if (!cancelled) setSeries(data.series || []); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [startDate, endDate]);

  const totalSent     = series.reduce((sum, d) => sum + d.sent, 0);
  const totalReceived = series.reduce((sum, d) => sum + d.received, 0);

  return (
    <div id="chart-file-activity" className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Activité des fichiers</h2>
        <p className="text-sm text-slate-400 mt-0.5">Fichiers envoyés vs reçus dans le temps</p>
      </div>

      {/* Légende — toujours visible pour 2 séries */}
      <div className="flex items-center gap-5 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLOR_SENT }} />
          <span className="text-slate-300">Envoyés</span>
          <span className="text-slate-500">({loading ? '…' : totalSent})</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLOR_RECEIVED }} />
          <span className="text-slate-300">Reçus</span>
          <span className="text-slate-500">({loading ? '…' : totalReceived})</span>
        </div>
      </div>

      <div className="h-72">
        {error ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">
            Impossible de charger les données.
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">
            Chargement…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="sent"
                name="Envoyés"
                stroke={COLOR_SENT}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="received"
                name="Reçus"
                stroke={COLOR_RECEIVED}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
