'use client';

/**
 * @param {{ label?: string, error?: string, hint?: string } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
export default function Input({ label, error, hint, className = '', id, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-NFS-dark"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={[
          'w-full rounded-xl px-3.5 py-2.5 text-sm',
          'bg-white border text-NFS-text placeholder-NFS-muted',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-NFS-primary focus:border-NFS-primary',
          error
            ? 'border-red-400 focus:ring-red-400'
            : 'border-NFS-border hover:border-NFS-primary/50',
          className,
        ].join(' ')}
        {...props}
      />

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-NFS-muted">{hint}</p>
      )}
    </div>
  );
}

