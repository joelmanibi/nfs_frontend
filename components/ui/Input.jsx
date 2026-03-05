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
          className="text-sm font-medium text-slate-300"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={[
          'w-full rounded-lg px-3.5 py-2.5 text-sm',
          'bg-slate-800 border text-slate-100 placeholder-slate-500',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-slate-600 hover:border-slate-500',
          className,
        ].join(' ')}
        {...props}
      />

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

