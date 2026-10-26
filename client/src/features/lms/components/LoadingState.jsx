export default function LoadingState({
  message = 'Loading...',
  rows = 3,
  variant = 'list',
  className = '',
}) {
  const safeRows = Math.max(1, Math.min(8, Number(rows) || 3));

  const skeleton = 'animate-pulse bg-[#303139] motion-reduce:animate-none';
  const subtleSkeleton = 'animate-pulse bg-[#26272B] motion-reduce:animate-none';

  if (variant === 'cards') {
    return (
      <div
        role="status"
        aria-label={message}
        aria-busy="true"
        className={`min-w-0 space-y-4 ${className}`}
      >
        <span className="sr-only">{message}</span>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: safeRows }, (_, index) => (
            <div
              key={index}
              className="min-w-0 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className={`h-4 w-28 max-w-full rounded ${skeleton}`} />
                <div className={`h-10 w-10 shrink-0 rounded-xl ${subtleSkeleton}`} />
              </div>

              <div className={`mt-6 h-8 w-20 rounded ${skeleton}`} />
              <div className={`mt-4 h-3 w-36 max-w-full rounded ${subtleSkeleton}`} />
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
        aria-busy="true"
        className={`min-w-0 overflow-hidden rounded-2xl border border-[#343640] bg-[#1D1F27] ${className}`}
      >
        <span className="sr-only">{message}</span>

        <div className="border-b border-[#343640] px-5 py-4">
          <div className={`h-4 w-36 rounded ${skeleton}`} />
        </div>

        {Array.from({ length: safeRows }, (_, index) => (
          <div
            key={index}
            className="flex min-w-0 animate-pulse items-center gap-4 border-b border-[#303139] px-5 py-4 last:border-b-0 motion-reduce:animate-none"
          >
            <div className={`h-10 w-10 shrink-0 rounded-full ${subtleSkeleton}`} />

            <div className="min-w-0 flex-1 space-y-2">
              <div className={`h-3 w-1/3 rounded ${skeleton}`} />
              <div className={`h-3 w-2/3 max-w-full rounded ${subtleSkeleton}`} />
            </div>

            <div className={`hidden h-7 w-20 shrink-0 rounded-full sm:block ${subtleSkeleton}`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={message}
      aria-busy="true"
      className={`min-w-0 space-y-4 ${className}`}
    >
      <span className="sr-only">{message}</span>

      {Array.from({ length: safeRows }, (_, index) => (
        <div
          key={index}
          className="flex min-w-0 animate-pulse items-center gap-4 rounded-xl border border-[#343640] bg-[#1D1F27] p-4 motion-reduce:animate-none"
        >
          <div className={`h-11 w-11 shrink-0 rounded-xl ${subtleSkeleton}`} />

          <div className="min-w-0 flex-1 space-y-2">
            <div className={`h-4 w-1/3 max-w-full rounded ${skeleton}`} />
            <div className={`h-3 w-2/3 max-w-full rounded ${subtleSkeleton}`} />
          </div>
        </div>
      ))}
    </div>
  );
}