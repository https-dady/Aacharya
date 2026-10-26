export default function LoadingState({
  message = 'Loading...',
  rows = 3,
  variant = 'list',
  className = '',
}) {
  const safeRows = Math.max(1, Math.min(8, Number(rows) || 3));

  if (variant === 'cards') {
    return (
      <div
        role="status"
        aria-label={message}
        className={`space-y-4 ${className}`}
      >
        <span className="sr-only">{message}</span>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: safeRows }, (_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded bg-slate-200" />
                <div className="h-10 w-10 rounded-xl bg-slate-100" />
              </div>

              <div className="mt-6 h-8 w-20 rounded bg-slate-200" />
              <div className="mt-4 h-3 w-36 max-w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div
        role="status"
        aria-label={message}
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}
      >
        <span className="sr-only">{message}</span>

        <div className="border-b border-slate-200 px-5 py-4">
          <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
        </div>

        {Array.from({ length: safeRows }, (_, index) => (
          <div
            key={index}
            className="flex animate-pulse items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
          >
            <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100" />

            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-slate-200" />
              <div className="h-3 w-2/3 rounded bg-slate-100" />
            </div>

            <div className="hidden h-7 w-20 rounded-full bg-slate-100 sm:block" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={message}
      className={`space-y-4 ${className}`}
    >
      <span className="sr-only">{message}</span>

      {Array.from({ length: safeRows }, (_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-100" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}