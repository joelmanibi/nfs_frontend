'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts';
import { adminAPI } from '@/lib/api';

// Comparaison de magnitude → une seule teinte séquentielle (bleu), pas de catégoriel.
const BAR_COLOR = '#3987e5';
const BAR_HEIGHT = 22;

function truncate(name, max = 24) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm text-white">{entry.payload.name}</p>
      <p className="text-xs text-slate-400">
        <span className="font-semibold text-slate-200">{entry.value}</span> fichier(s) envoyé(s)
      </p>
    </div>
  );
}

export default function TopSendersChart() {
  const [topSenders, setTopSenders] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);

  useEffect(() => {
    let cancelled = false;

    adminAPI.getTopSenders()
      .then(({ data }) => { if (!cancelled) setTopSenders(data.topSenders || []); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const data = topSenders.map((s) => ({ ...s, label: truncate(s.name) }));
  const chartHeight = Math.max(280, data.length * 28);

  return (
    <div id="chart-top-senders" className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Top 20 utilisateurs</h2>
        <p className="text-sm text-slate-400 mt-0.5">Les comptes qui transfèrent le plus de fichiers (total, tous historiques)</p>
      </div>

      {error ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-500">
          Impossible de charger les données.
        </div>
      ) : loading ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-500">
          Chargement…
        </div>
      ) : data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-500">
          Aucun transfert enregistré.
        </div>
      ) : (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 28, left: 8, bottom: 0 }}
              barCategoryGap={8}
            >
              <CartesianGrid horizontal={false} stroke="#334155" strokeDasharray="3 3" />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={150}
                tick={{ fill: '#cbd5e1', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#33415533' }} />
              <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={BAR_HEIGHT}>
                <LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
