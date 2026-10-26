const TREND_STYLES = {
  positive: 'border-[#5A8C78]/30 bg-[#5A8C78]/15 text-[#A6D8C1]',
  negative: 'border-[#B86D78]/30 bg-[#B86D78]/15 text-[#F0B0B9]',
  neutral: 'border-[#777982]/30 bg-[#777982]/15 text-[#C0C1C8]',
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
    indigo: 'border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]',
    blue: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    amber: 'border-[#E5DF98]/20 bg-[#E5DF98]/10 text-[#E5DF98]',
    rose: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
    violet: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
    cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  };

  const iconStyle = accentStyles[accent] || accentStyles.indigo;
  const trendStyle = TREND_STYLES[trend] || TREND_STYLES.neutral;

  return (
    <article
      className={[
        'min-w-0 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5',
        'transition duration-200 hover:-translate-y-0.5 hover:border-[#4A4658]',
        'hover:shadow-lg hover:shadow-black/10 sm:p-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium leading-5 text-[#A5A6B0]">
            {title}
          </p>

          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-[#EAEAE6] sm:text-3xl">
            {value ?? '—'}
          </p>
        </div>

        {icon && (
          <div
            className={[
              'flex h-11 w-11 shrink-0 items-center justify-center',
              'rounded-xl border',
              iconStyle,
            ].join(' ')}
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
              className={[
                'inline-flex max-w-full items-center rounded-full border',
                'px-2.5 py-1 text-xs font-semibold',
                trendStyle,
              ].join(' ')}
            >
              <span className="break-words">{trendLabel}</span>
            </span>
          )}

          {description && (
            <p className="min-w-0 break-words text-xs leading-5 text-[#92929F]">
              {description}
            </p>
          )}
        </div>
      )}
    </article>
  );
}