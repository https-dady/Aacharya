import { useId } from 'react';

export default function FormField({
  label,
  name,
  id,
  type = 'text',
  value,
  defaultValue,
  onChange,
  placeholder,
  helperText,
  error,
  required = false,
  disabled = false,
  readOnly = false,
  autoComplete,
  inputMode,
  startAdornment,
  endAdornment,
  className = '',
  inputClassName = '',
  labelClassName = '',
  ...inputProps
}) {
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const describedBy = [
    helperText && !error ? helperId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={['w-full space-y-2', className].filter(Boolean).join(' ')}>
      {label && (
        <label
          htmlFor={inputId}
          className={[
            'block text-sm font-semibold text-[#EAEAE6]',
            labelClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {label}

          {required && (
            <span className="ml-1 text-[#E5DF98]" aria-hidden="true">
              *
            </span>
          )}

          {required && <span className="sr-only"> (required)</span>}
        </label>
      )}

      <div className="relative flex items-stretch">
        {startAdornment && (
          <span className="inline-flex items-center rounded-l-xl border border-r-0 border-[#454650] bg-[#26272B] px-3 text-sm text-[#A7A7B0]">
            {startAdornment}
          </span>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={[
            'min-h-11 w-full min-w-0 rounded-xl border bg-[#1D1F27]',
            'px-3.5 py-2.5 text-sm text-[#EAEAE6]',
            'placeholder:text-[#858590]',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2',
            'focus-visible:ring-offset-[#14161C]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'read-only:cursor-default',
            startAdornment ? 'rounded-l-none' : '',
            endAdornment ? 'rounded-r-none' : '',
            error
              ? 'border-[#D58B95] focus-visible:ring-[#D58B95]'
              : 'border-[#454650] hover:border-[#62636E]',
            'motion-reduce:transition-none',
            inputClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          {...inputProps}
        />

        {endAdornment && (
          <span className="inline-flex items-center rounded-r-xl border border-l-0 border-[#454650] bg-[#26272B] px-3 text-sm text-[#A7A7B0]">
            {endAdornment}
          </span>
        )}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-[#D58B95]"
        >
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs leading-5 text-[#A7A7B0]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}