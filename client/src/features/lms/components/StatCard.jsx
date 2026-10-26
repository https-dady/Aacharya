const TREND_STYLES = {
  positive: 'bg-emerald-50 text-emerald-700',
  negative: 'bg-rose-50 text-rose-700',
  neutral: 'bg-slate-100 text-slate-600',
};

export default function StatCard({
  title,
  value,
  description,
  trend,
  trendLabel,
  icon,
  accent = 'indigo',
  className = '',
}) {
  const accentStyles = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };

  const iconStyle = accentStyles[accent] || accentStyles.indigo;
  const trendStyle = TREND_STYLES[trend] || TREND_STYLES.neutral;

  return (
    <article
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {value ?? '—'}
          </p>
        </div>

        {icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
          >
            {typeof icon === 'string' ? (
              <span className="text-xl" aria-hidden="true">
                {icon}
              </span>
            ) : (
              icon
            )}
          </div>
        )}
      </div>

      {(description || trendLabel) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {trendLabel && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${trendStyle}`}
            >
              {trendLabel}
            </span>
          )}

          {description && (
            <p className="text-xs leading-5 text-slate-500">
              {description}
            </p>
          )}
        </div>
      )}
    </article>
  );
}