'use client';

const colors = {
  blue:   'bg-nfs-100 text-nfs-dark border border-nfs-border',
  green:  'bg-green-50 text-green-700 border border-green-200',
  red:    'bg-red-50 text-red-600 border border-red-200',
  yellow: 'bg-amber-50 text-amber-700 border border-amber-200',
  slate:  'bg-gray-100 text-gray-600 border border-gray-200',
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

