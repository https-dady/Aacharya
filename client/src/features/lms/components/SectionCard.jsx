const VARIANT_STYLES = {
  default: {
    container: 'border-[#343640] bg-[#1D1F27]',
    divider: 'border-[#343640]',
    icon: 'bg-[#CDB5F7]/10 text-[#CDB5F7]',
    eyebrow: 'text-[#CDB5F7]',
    title: 'text-[#EAEAE6]',
    description: 'text-[#A5A6B0]',
  },
  elevated: {
    container: 'border-[#3B3C43] bg-[#26272B]',
    divider: 'border-[#3B3C43]',
    icon: 'bg-[#E5DF98]/10 text-[#E5DF98]',
    eyebrow: 'text-[#E5DF98]',
    title: 'text-[#EAEAE6]',
    description: 'text-[#B2B2BC]',
  },
  contrast: {
    container: 'border-[#CDB5F7]/30 bg-[#20212A]',
    divider: 'border-[#CDB5F7]/20',
    icon: 'bg-[#CDB5F7]/15 text-[#CDB5F7]',
    eyebrow: 'text-[#CDB5F7]',
    title: 'text-[#EAEAE6]',
    description: 'text-[#B8B8C2]',
  },
};

export default function SectionCard({
  title,
  description,
  eyebrow,
  icon,
  action,
  children,
  variant = 'default',
  className = '',
}) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.default;

  const hasHeader = Boolean(
    title || description || eyebrow || icon || action,
  );

  return (
    <section
      className={[
        'min-w-0 overflow-hidden rounded-2xl border',
        styles.container,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {hasHeader && (
        <header
          className={[
            'flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6',
            children ? `border-b ${styles.divider}` : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {icon && (
              <div
                className={[
                  'flex h-10 w-10 shrink-0 items-center justify-center',
                  'rounded-xl border border-white/5',
                  styles.icon,
                ].join(' ')}
              >
                {typeof icon === 'string' ? (
                  <span aria-hidden="true">{icon}</span>
                ) : (
                  icon
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              {eyebrow && (
                <p
                  className={[
                    'mb-1 break-words text-xs font-semibold uppercase',
                    'tracking-[0.14em]',
                    styles.eyebrow,
                  ].join(' ')}
                >
                  {eyebrow}
                </p>
              )}

              {title && (
                <h2
                  className={[
                    'break-words text-base font-semibold tracking-tight',
                    'sm:text-lg',
                    styles.title,
                  ].join(' ')}
                >
                  {title}
                </h2>
              )}

              {description && (
                <p
                  className={[
                    'mt-1 break-words text-sm leading-6',
                    styles.description,
                  ].join(' ')}
                >
                  {description}
                </p>
              )}
            </div>
          </div>

          {action && (
            <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">
              {action}
            </div>
          )}
        </header>
      )}

      {children != null && (
        <div className="min-w-0 p-5 sm:p-6">{children}</div>
      )}
    </section>
  );
}