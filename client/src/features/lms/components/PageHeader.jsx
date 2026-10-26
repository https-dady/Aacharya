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
      className={`mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm"
          >
            {breadcrumbs.map((breadcrumb, index) => {
              const label = breadcrumb.label ?? breadcrumb.title;
              const destination = breadcrumb.to ?? breadcrumb.path;
              const isLast = index === breadcrumbs.length - 1;

              if (!label) {
                return null;
              }

              return (
                <span
                  key={`${label}-${index}`}
                  className="inline-flex items-center gap-2"
                >
                  {index > 0 && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5 text-slate-600"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}

                  {destination && !isLast ? (
                    <Link
                      to={destination}
                      className="rounded text-slate-400 transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? 'page' : undefined}
                      className={
                        isLast
                          ? 'font-medium text-slate-200'
                          : 'text-slate-400'
                      }
                    >
                      {label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
            {eyebrow}
          </p>
        )}

        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            {description}
          </p>
        )}

        {children && <div className="mt-3">{children}</div>}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </section>
  );
}