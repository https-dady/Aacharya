import { useId, useState } from 'react';

export default function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  label = 'Search',
  name = 'search',
  disabled = false,
  clearable = true,
  className = '',
  inputClassName = '',
  ...inputProps
}) {
  const generatedId = useId();
  const inputId = `${name}-${generatedId}`;
  const [internalValue, setInternalValue] = useState('');

  const isControlled = value !== undefined;
  const searchValue = isControlled ? value : internalValue;

  function handleChange(event) {
    const nextValue = event.target.value;

    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.(event);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSearch?.(searchValue.trim());
  }

  function handleClear() {
    if (!isControlled) {
      setInternalValue('');
    }

    onChange?.({
      target: {
        name,
        value: '',
      },
    });

    onSearch?.('');
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={['w-full', className].filter(Boolean).join(' ')}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>

      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-[#454650] bg-[#1D1F27] px-3 transition-colors duration-150 focus-within:border-[#CDB5F7] focus-within:ring-2 focus-within:ring-[#CDB5F7]/30 motion-reduce:transition-none">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 shrink-0 text-[#A7A7B0]"
        >
          <circle
            cx="10.8"
            cy="10.8"
            r="6.8"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="m16 16 4 4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>

        <input
          id={inputId}
          name={name}
          type="search"
          value={searchValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={[
            'min-w-0 flex-1 bg-transparent py-2.5 text-sm',
            'text-[#EAEAE6] placeholder:text-[#858590]',
            'outline-none disabled:cursor-not-allowed disabled:opacity-50',
            '[&::-webkit-search-cancel-button]:hidden',
            inputClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          {...inputProps}
        />

        {clearable && searchValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#A7A7B0] hover:bg-[#26272B] hover:text-[#EAEAE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
            >
              <path
                d="m7 7 10 10M17 7 7 17"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}

        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg bg-[#CDB5F7] px-3 py-2 text-xs font-bold text-[#14161C] transition-colors hover:bg-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1F27] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          Search
        </button>
      </div>
    </form>
  );
}