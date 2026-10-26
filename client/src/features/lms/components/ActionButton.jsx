export default function ActionButton({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  className = '',
  onClick,
  ...props
}) {
  const variants = {
    primary:
      'border border-[#CDB5F7] bg-[#CDB5F7] text-[#14161C] hover:bg-[#DCCBFA] active:bg-[#BCA0F0]',
    secondary:
      'border border-[#454650] bg-[#26272B] text-[#EAEAE6] hover:border-[#5A5B65] hover:bg-[#303139] active:bg-[#202126]',
    butter:
      'border border-[#E5DF98] bg-[#E5DF98] text-[#14161C] hover:bg-[#EEE9B4] active:bg-[#D7D087]',
    danger:
      'border border-[#B86D78] bg-[#B86D78] text-[#14161C] hover:bg-[#D58B95] active:bg-[#A95C68]',
    ghost:
      'border border-transparent bg-transparent text-[#CDB5F7] hover:border-[#CDB5F7]/20 hover:bg-[#CDB5F7]/10 active:bg-[#CDB5F7]/15',
    outline:
      'border border-[#CDB5F7]/50 bg-transparent text-[#CDB5F7] hover:border-[#CDB5F7] hover:bg-[#CDB5F7]/10 active:bg-[#CDB5F7]/15',
  };

  const sizes = {
    sm: 'min-h-9 gap-1.5 rounded-lg px-3 py-1.5 text-xs',
    md: 'min-h-11 gap-2 rounded-xl px-4 py-2.5 text-sm',
    lg: 'min-h-12 gap-2 rounded-xl px-5 py-3 text-sm',
  };

  const selectedVariant = variants[variant] || variants.primary;
  const selectedSize = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center font-semibold',
        'whitespace-nowrap transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2',
        'focus-visible:ring-offset-[#14161C]',
        'disabled:pointer-events-none disabled:opacity-45',
        'motion-reduce:transition-none',
        selectedVariant,
        selectedSize,
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
          />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {leadingIcon && (
            <span className="inline-flex shrink-0 items-center justify-center">
              {leadingIcon}
            </span>
          )}

          <span>{children}</span>

          {trailingIcon && (
            <span className="inline-flex shrink-0 items-center justify-center">
              {trailingIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
}