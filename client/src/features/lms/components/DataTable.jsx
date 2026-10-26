import EmptyState from './EmptyState.jsx';
import LoadingState from './LoadingState.jsx';

function getRowKey(row, index, rowKey) {
  if (typeof rowKey === 'function') {
    return rowKey(row, index);
  }

  if (typeof rowKey === 'string') {
    return row[rowKey] ?? index;
  }

  return row.id ?? row._id ?? index;
}

function getCellValue(row, column) {
  if (typeof column.accessor === 'function') {
    return column.accessor(row);
  }

  const key = column.accessor ?? column.key;

  if (typeof key !== 'string') {
    return undefined;
  }

  return key.split('.').reduce(
    (value, part) => value?.[part],
    row,
  );
}

function renderCellValue(value) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-[#777783]">—</span>;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return value;
  }

  return value;
}

export default function DataTable({
  columns = [],
  data = [],
  rowKey = 'id',
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records to display right now.',
  emptyAction,
  caption,
  ariaLabel = 'Data table',
  onRowClick,
  className = '',
  minWidth = '640px',
}) {
  const hasColumns = columns.length > 0;
  const hasRows = data.length > 0;

  if (!hasColumns) {
    return (
      <EmptyState
        title="Table configuration unavailable"
        description="Add at least one column to display this table."
        className={className}
      />
    );
  }

  if (loading && !hasRows) {
    return (
      <LoadingState
        variant="table"
        rows={4}
        message="Loading table records"
        className={className}
      />
    );
  }

  if (!loading && !hasRows) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <div
      className={[
        'min-w-0 overflow-hidden rounded-2xl',
        'border border-[#343640] bg-[#1D1F27]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="min-w-0 overflow-x-auto"
        aria-busy={loading}
      >
        <table
          aria-label={caption ? undefined : ariaLabel}
          className="w-full border-collapse text-left text-sm"
          style={{ minWidth }}
        >
          {caption && (
            <caption className="border-b border-[#343640] px-5 py-3 text-left text-sm font-medium text-[#A5A6B0]">
              {caption}
            </caption>
          )}

          <thead>
            <tr className="border-b border-[#383943] bg-[#26272B]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={[
                    'whitespace-nowrap px-5 py-4',
                    'text-xs font-semibold uppercase tracking-wider',
                    'text-[#A5A6B0]',
                    column.headerClassName || '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#303139]">
            {data.map((row, index) => {
              const key = getRowKey(row, index, rowKey);

              return (
                <tr
                  key={key}
                  onClick={
                    onRowClick
                      ? () => onRowClick(row)
                      : undefined
                  }
                  className={[
                    'transition-colors duration-150',
                    'hover:bg-[#26272B]/70',
                    onRowClick
                      ? 'cursor-pointer focus-within:bg-[#26272B]'
                      : '',
                    'motion-reduce:transition-none',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {columns.map((column) => {
                    const value = getCellValue(row, column);

                    return (
                      <td
                        key={column.key}
                        className={[
                          'px-5 py-4 text-[#EAEAE6]',
                          column.cellClassName || '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {column.render
                          ? column.render(value, row, index)
                          : renderCellValue(value)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && hasRows && (
        <div
          role="status"
          className="border-t border-[#383943] px-5 py-3 text-xs text-[#A5A6B0]"
        >
          Updating records…
        </div>
      )}
    </div>
  );
}