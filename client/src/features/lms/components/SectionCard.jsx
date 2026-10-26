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
  const variants = {
    default: 'bg-[#1D1F27] border-[#343640]',
    elevated: 'bg-[#26272B] border-[#3B3C43]',
    contrast: 'bg-[#EAEAE6] border-[#D4D4CF]',
  };

  const selectedVariant = variants[variant] || variants.default;
  const isContrast = variant === 'contrast';

  return (
    <section
      className={`min-w-0 overflow-hidden rounded-2xl border ${selectedVariant} ${className}`}
    >
      {(title || description || eyebrow || icon || action) && (
        <header
          className={`flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6 ${
            children ? 'border-b' : ''
          } ${isContrast ? 'border-[#D4D4CF]' : 'border-[#343640]'}`}
        >
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isContrast
                    ? 'bg-[#14161C] text-[#CDB5F7]'
                    : 'bg-[#CDB5F7]/10 text-[#CDB5F7]'
                }`}
              >
                {typeof icon === 'string' ? (
                  <span aria-hidden="true">{icon}</span>
                ) : (
                  icon
                )}
              </div>
            )}

            <div className="min-w-0">
              {eyebrow && (
                <p
                  className={`mb-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                    isContrast ? 'text-[#55565E]' : 'text-[#CDB5F7]'
                  }`}
                >
                  {eyebrow}
                </p>
              )}

              {title && (
                <h2
                  className={`text-base font-semibold tracking-tight sm:text-lg ${
                    isContrast ? 'text-[#14161C]' : 'text-[#EAEAE6]'
                  }`}
                >
                  {title}
                </h2>
              )}

              {description && (
                <p
                  className={`mt-1 text-sm leading-6 ${
                    isContrast ? 'text-[#55565E]' : 'text-[#A5A6B0]'
                  }`}
                >
                  {description}
                </p>
              )}
            </div>
          </div>

          {action && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {action}
            </div>
          )}
        </header>
      )}

      {children && (
        <div className="min-w-0 p-5 sm:p-6">
          {children}
        </div>
      )}
    </section>
  );
}