'use client';

const colors = {
  blue:   'bg-blue-900/40 text-blue-300 border border-blue-700/50',
  green:  'bg-green-900/40 text-green-300 border border-green-700/50',
  red:    'bg-red-900/40 text-red-300 border border-red-700/50',
  yellow: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50',
  slate:  'bg-slate-700/60 text-slate-300 border border-slate-600/50',
};

/**
 * @param {{ color?: keyof colors, dot?: boolean } & React.HTMLAttributes<HTMLSpanElement>} props
 */
export default function Badge({ children, color = 'slate', dot = false, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        colors[color],
        className,
      ].join(' ')}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full bg-current`} />
      )}
      {children}
    </span>
  );
}

