import { useMemo } from 'react';

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  disabled = false,
  className = '',
}) {
  const currentPage = Math.max(1, Number(page) || 1);
  const pageCount = Math.max(1, Number(totalPages) || 1);
  const itemCount = Math.max(0, Number(totalItems) || 0);
  const currentPageSize = Math.max(1, Number(pageSize) || 10);

  const startItem =
    itemCount === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;

  const endItem = Math.min(
    currentPage * currentPageSize,
    itemCount,
  );

  const pages = useMemo(() => {
    const visiblePages = new Set([
      1,
      pageCount,
      currentPage,
      currentPage - 1,
      currentPage + 1,
    ]);

    return [...visiblePages]
      .filter((value) => value >= 1 && value <= pageCount)
      .sort((a, b) => a - b);
  }, [currentPage, pageCount]);

  function changePage(nextPage) {
    if (
      disabled ||
      nextPage < 1 ||
      nextPage > pageCount ||
      nextPage === currentPage
    ) {
      return;
    }

    onPageChange?.(nextPage);
  }

  function renderPageNumbers() {
    const elements = [];
    let previousPage = 0;

    pages.forEach((pageNumber) => {
      if (previousPage && pageNumber - previousPage > 1) {
        elements.push(
          <span
            key={`ellipsis-${previousPage}`}
            aria-hidden="true"
            className="px-1 text-[#777783]"
          >
            …
          </span>,
        );
      }

      const isCurrentPage = pageNumber === currentPage;

      elements.push(
        <button
          key={pageNumber}
          type="button"
          aria-label={`Page ${pageNumber}`}
          aria-current={isCurrentPage ? 'page' : undefined}
          disabled={disabled}
          onClick={() => changePage(pageNumber)}
          className={[
            'inline-flex h-9 min-w-9 items-center justify-center',
            'rounded-lg border px-2 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#CDB5F7]',
            isCurrentPage
              ? 'border-[#CDB5F7] bg-[#CDB5F7] text-[#14161C]'
              : 'border-[#383943] bg-[#1D1F27] text-[#C4C4CD] hover:bg-[#26272B]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          ].join(' ')}
        >
          {pageNumber}
        </button>,
      );

      previousPage = pageNumber;
    });

    return elements;
  }

  return (
    <nav
      aria-label="Pagination"
      className={[
        'flex min-w-0 flex-col gap-4 border-t border-[#343640]',
        'px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p
          aria-live="polite"
          className="text-xs leading-5 text-[#A5A6B0]"
        >
          Showing{' '}
          <span className="font-semibold text-[#EAEAE6]">
            {startItem}–{endItem}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-[#EAEAE6]">
            {itemCount}
          </span>
        </p>

        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-xs text-[#A5A6B0]">
            Rows
            <select
              value={currentPageSize}
              disabled={disabled}
              onChange={(event) =>
                onPageSizeChange(Number(event.target.value))
              }
              className={[
                'h-9 rounded-lg border border-[#383943]',
                'bg-[#1D1F27] px-2 text-sm text-[#EAEAE6]',
                'outline-none focus-visible:ring-2',
                'focus-visible:ring-[#CDB5F7]',
                'disabled:cursor-not-allowed disabled:opacity-50',
              ].join(' ')}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous page"
          disabled={disabled || currentPage <= 1}
          onClick={() => changePage(currentPage - 1)}
          className={[
            'mr-1 inline-flex h-9 items-center justify-center',
            'rounded-lg border border-[#383943] bg-[#1D1F27]',
            'px-3 text-sm text-[#C4C4CD] transition-colors',
            'hover:bg-[#26272B]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#CDB5F7]',
            'disabled:cursor-not-allowed disabled:opacity-40',
          ].join(' ')}
        >
          Previous
        </button>

        {renderPageNumbers()}

        <button
          type="button"
          aria-label="Next page"
          disabled={disabled || currentPage >= pageCount}
          onClick={() => changePage(currentPage + 1)}
          className={[
            'ml-1 inline-flex h-9 items-center justify-center',
            'rounded-lg border border-[#383943] bg-[#1D1F27]',
            'px-3 text-sm text-[#C4C4CD] transition-colors',
            'hover:bg-[#26272B]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#CDB5F7]',
            'disabled:cursor-not-allowed disabled:opacity-40',
          ].join(' ')}
        >
          Next
        </button>
      </div>
    </nav>
  );
}