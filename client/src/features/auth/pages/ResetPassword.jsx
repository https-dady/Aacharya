import { useState } from 'react';

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  autoComplete,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[#EAEAE6]"
      >
        {label}
      </label>

      <div className="flex items-center rounded-xl border border-[#383943] bg-[#1D1F27] transition-colors focus-within:border-[#CDB5F7]">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete={autoComplete}
          minLength={8}
          maxLength={128}
          required
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm text-[#EAEAE6] outline-none placeholder:text-[#858590] disabled:cursor-not-allowed disabled:opacity-60"
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="mr-3 rounded-lg px-2 py-1 text-xs font-medium text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CDB5F7] disabled:cursor-not-allowed"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

export default function ResetPassword({
  resetToken = '',
  onSubmit,
  onBackToLogin,
  loading = false,
  error = '',
  success = '',
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setValidationError('');

    if (!resetToken) {
      setValidationError(
        'Your password reset session is invalid. Please restart account recovery.',
      );
      return;
    }

    if (newPassword.length < 8) {
      setValidationError(
        'Your new password must contain at least 8 characters.',
      );
      return;
    }

    if (newPassword.length > 128) {
      setValidationError(
        'Your password cannot exceed 128 characters.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('The passwords do not match.');
      return;
    }

    onSubmit?.({
      resetToken,
      newPassword,
    });
  }

  return (
    <section className="w-full max-w-md">
      <button
        type="button"
        onClick={onBackToLogin}
        disabled={loading}
        className="mb-8 inline-flex items-center gap-2 rounded text-sm text-[#A4A4AF] transition-colors hover:text-[#CDB5F7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CDB5F7] disabled:opacity-50"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M19 12H5M12 19L5 12L12 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        Back to sign in
      </button>

      <div className="mb-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 px-3 py-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[#E5DF98]"
          />

          <span className="text-[10px] font-semibold tracking-[0.18em] text-[#CDB5F7]">
            ACCOUNT SECURITY
          </span>
        </div>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#EAEAE6] sm:text-5xl">
          Reset your
          <br />
          <span className="text-[#CDB5F7]">password.</span>
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#A4A4AF]">
          Choose a new password for your Aacharya LMS account. Use at
          least 8 characters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {(validationError || error) && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm leading-5 text-red-300"
          >
            {validationError || error}
          </div>
        )}

        {success && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm leading-5 text-emerald-300"
          >
            {success}
          </div>
        )}

        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
            setValidationError('');
          }}
          disabled={loading}
          autoComplete="new-password"
        />

        <PasswordField
          id="confirm-password"
          label="Confirm password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setValidationError('');
          }}
          disabled={loading}
          autoComplete="new-password"
        />

        <div className="rounded-xl border border-[#383943] bg-[#1D1F27] p-4">
          <p className="mb-3 text-xs font-medium text-[#EAEAE6]">
            Password requirements
          </p>

          <ul className="space-y-2 text-xs text-[#A4A4AF]">
            <li className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                  newPassword.length >= 8
                    ? 'bg-[#E5DF98]'
                    : 'bg-[#62626D]'
                }`}
              />
              At least 8 characters
            </li>

            <li className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                  newPassword.length > 0 &&
                  newPassword === confirmPassword
                    ? 'bg-[#E5DF98]'
                    : 'bg-[#62626D]'
                }`}
              />
              Both passwords match
            </li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading || !resetToken}
          className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#CDB5F7] px-5 py-3.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#E5DF98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>
            {loading ? 'Updating password...' : 'Update password'}
          </span>

          {loading ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-[#14161C]/30 border-t-[#14161C]"
            />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-1"
            >
              <path
                d="M5 12H19M12 5L19 12L12 19"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <p className="text-center text-xs leading-5 text-[#858590]">
          Your new password will be submitted securely for server-side
          validation.
        </p>
      </form>
    </section>
  );
}