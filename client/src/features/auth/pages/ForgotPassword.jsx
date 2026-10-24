import { useState } from 'react';

export default function ForgotPassword({
  email = '',
  onEmailChange,
  onSubmit,
  onBackToLogin,
  loading = false,
  error = '',
  success = '',
}) {
  const [localEmail, setLocalEmail] = useState(email);

  const currentEmail = onEmailChange ? email : localEmail;

  function handleEmailChange(event) {
    const value = event.target.value;

    setLocalEmail(value);

    if (onEmailChange) {
      onEmailChange(value);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (onSubmit) {
      onSubmit(event, currentEmail.trim());
    }
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
          <span className="h-2 w-2 rounded-full bg-[#E5DF98]" />

          <span className="text-[10px] font-semibold tracking-[0.18em] text-[#CDB5F7]">
            ACCOUNT RECOVERY
          </span>
        </div>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#EAEAE6] sm:text-5xl">
          Forgot
          <br />
          <span className="text-[#CDB5F7]">password?</span>
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#A4A4AF]">
          Enter the email address associated with your account. If the
          account is eligible, you can continue with the verification
          process.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
          >
            {success}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="recovery-email"
            className="block text-sm font-medium text-[#EAEAE6]"
          >
            Email address
          </label>

          <input
            id="recovery-email"
            name="email"
            type="email"
            value={currentEmail}
            onChange={handleEmailChange}
            placeholder="you@example.com"
            autoComplete="email"
            required
            maxLength={254}
            disabled={loading}
            className="w-full rounded-xl border border-[#383943] bg-[#1D1F27] px-4 py-3.5 text-sm text-[#EAEAE6] outline-none transition-colors placeholder:text-[#858590] hover:border-[#50515D] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/10 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#CDB5F7] px-5 py-3.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#E5DF98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>
            {loading ? 'Sending request...' : 'Continue'}
          </span>

          {!loading && (
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
          For your security, account recovery responses may not disclose
          whether a particular email address is registered.
        </p>
      </form>
    </section>
  );
}