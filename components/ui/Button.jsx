'use client';

const variants = {
  primary:
    'bg-NFS-primary hover:bg-NFS-light text-white shadow-sm shadow-NFS-primary/30',
  secondary:
    'bg-white hover:bg-NFS-50 text-NFS-dark border border-NFS-border',
  danger:
    'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-500/30',
  ghost:
    'bg-transparent hover:bg-NFS-50 text-NFS-dark',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

/**
 * @param {{ variant?: keyof variants, size?: keyof sizes, loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-NFS-primary focus:ring-offset-2 focus:ring-offset-white',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

