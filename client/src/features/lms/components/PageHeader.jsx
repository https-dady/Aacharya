import { Link } from 'react-router-dom';

export default function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs = [],
  actions,
  children,
  className = '',
}) {
  return (
    <section
      className={[
        'mb-6 flex min-w-0 flex-col gap-4',
        'sm:mb-8 sm:flex-row sm:items-end sm:justify-between',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-4"
          >
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#92929F]">
              {breadcrumbs.map((breadcrumb, index) => {
                const isLast =
                  index === breadcrumbs.length - 1;

                return (
                  <li
                    key={`${breadcrumb.label}-${index}`}
                    className="inline-flex min-w-0 items-center gap-2"
                  >
                    {index > 0 && (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3 w-3 shrink-0 text-[#62636E]"
                      >
                        <path
                          d="m6 3 5 5-5 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}

                    {breadcrumb.to && !isLast ? (
                      <Link
                        to={breadcrumb.to}
                        className="truncate transition-colors hover:text-[#CDB5F7] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-[#CDB5F7]"
                      >
                        {breadcrumb.label}
                      </Link>
                    ) : (
                      <span
                        aria-current={isLast ? 'page' : undefined}
                        className={[
                          'truncate',
                          isLast
                            ? 'font-medium text-[#EAEAE6]'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {breadcrumb.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {eyebrow && (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#CDB5F7]">
            {eyebrow}
          </p>
        )}

        <h1 className="break-words text-2xl font-bold tracking-tight text-[#EAEAE6] sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A4A4AF]">
            {description}
          </p>
        )}

        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      )}
    </section>
  );
}