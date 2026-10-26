const STATUS_CONFIG = {
  present: {
    label: 'Present',
    className: 'border-[#5A8C78]/40 bg-[#5A8C78]/15 text-[#A6D8C1]',
  },
  absent: {
    label: 'Absent',
    className: 'border-[#B86D78]/40 bg-[#B86D78]/15 text-[#F0B0B9]',
  },
  leave: {
    label: 'Leave',
    className: 'border-[#CDB5F7]/40 bg-[#CDB5F7]/15 text-[#CDB5F7]',
  },
  'on-duty': {
    label: 'On Duty',
    className: 'border-[#E5DF98]/40 bg-[#E5DF98]/15 text-[#E5DF98]',
  },
  pending: {
    label: 'Pending',
    className: 'border-[#E5DF98]/40 bg-[#E5DF98]/15 text-[#E5DF98]',
  },
  approved: {
    label: 'Approved',
    className: 'border-[#5A8C78]/40 bg-[#5A8C78]/15 text-[#A6D8C1]',
  },
  rejected: {
    label: 'Rejected',
    className: 'border-[#B86D78]/40 bg-[#B86D78]/15 text-[#F0B0B9]',
  },
  active: {
    label: 'Active',
    className: 'border-[#CDB5F7]/40 bg-[#CDB5F7]/15 text-[#CDB5F7]',
  },
  inactive: {
    label: 'Inactive',
    className: 'border-[#777982]/40 bg-[#777982]/15 text-[#C0C1C8]',
  },
  completed: {
    label: 'Completed',
    className: 'border-[#5A8C78]/40 bg-[#5A8C78]/15 text-[#A6D8C1]',
  },
  overdue: {
    label: 'Overdue',
    className: 'border-[#B86D78]/40 bg-[#B86D78]/15 text-[#F0B0B9]',
  },
  draft: {
    label: 'Draft',
    className: 'border-[#777982]/40 bg-[#777982]/15 text-[#C0C1C8]',
  },
};

export default function StatusBadge({
  status,
  label,
  size = 'md',
  className = '',
}) {
  const normalizedStatus = String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  const config = STATUS_CONFIG[normalizedStatus] ?? {
    label: status ? String(status) : 'Unknown',
    className: 'border-[#777982]/40 bg-[#777982]/15 text-[#C0C1C8]',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const selectedSize = sizeStyles[size] ?? sizeStyles.md;

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border font-medium leading-4 ${selectedSize} ${config.className} ${className}`}
    >
      <span className="truncate">{label ?? config.label}</span>
    </span>
  );
}