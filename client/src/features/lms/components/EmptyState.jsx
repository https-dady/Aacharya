export default function EmptyState({
  title = 'Nothing here yet',
  description = 'There is no data to display right now.',
  icon,
  action,
  className = '',
}) {
  return (
    <section
      aria-label={title}
      className={[
        'flex min-w-0 flex-col items-center justify-center',
        'rounded-2xl border border-dashed border-[#3B3C43]',
        'bg-[#1D1F27] px-5 py-12 text-center sm:px-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/10 text-[#CDB5F7]">
        {icon || (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-7 w-7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7h8M8 11h8M8 15h5"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 3.75h8.5L19 8.25v12A1.75 1.75 0 0 1 17.25 22h-11A1.75 1.75 0 0 1 4.5 20.25V5.5A1.75 1.75 0 0 1 6.25 3.75Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.5 4v4.5H19"
            />
          </svg>
        )}
      </div>

      <h2 className="max-w-full break-words text-lg font-semibold tracking-tight text-[#EAEAE6]">
        {title}
      </h2>

      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-[#A5A6B0]">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
        </div>
      )}
    </section>
  );
}