import { useState } from 'react';

const OTP_LENGTH = 6;

export default function VerifyResetOtp({
  email = '',
  challengeId = '',
  onSubmit,
  onBack,
  loading = false,
  error = '',
  success = '',
}) {
  const [otp, setOtp] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    if (otp.length !== OTP_LENGTH) {
      return;
    }

    onSubmit?.({
      challengeId,
      otp,
    });
  }

  return (
    <section className="w-full max-w-md">
      <button
        type="button"
        onClick={onBack}
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

        Back
      </button>

      <div className="mb-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#E5DF98]" />

          <span className="text-[10px] font-semibold tracking-[0.18em] text-[#CDB5F7]">
            SECURITY VERIFICATION
          </span>
        </div>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#EAEAE6] sm:text-5xl">
          Verify
          <br />
          <span className="text-[#CDB5F7]">your code.</span>
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#A4A4AF]">
          Enter the six-digit verification code sent to your registered
          email address.
        </p>

        {email && (
          <p className="mt-2 break-all text-sm font-medium text-[#E5DF98]">
            {email}
          </p>
        )}
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
            htmlFor="reset-otp"
            className="block text-sm font-medium text-[#EAEAE6]"
          >
            Verification code
          </label>

          <input
            id="reset-otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={OTP_LENGTH}
            maxLength={OTP_LENGTH}
            value={otp}
            onChange={(event) => {
              const value = event.target.value
                .replace(/\D/g, '')
                .slice(0, OTP_LENGTH);

              setOtp(value);
            }}
            placeholder="000000"
            required
            disabled={loading}
            aria-describedby="otp-help"
            className="w-full rounded-xl border border-[#383943] bg-[#1D1F27] px-4 py-5 text-center font-mono text-2xl tracking-[0.65em] text-[#EAEAE6] outline-none transition-colors placeholder:text-[#50515D] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/10 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <p id="otp-help" className="text-xs leading-5 text-[#858590]">
            Enter all six digits. The code must match the one sent by
            the server.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || otp.length !== OTP_LENGTH || !challengeId}
          className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#CDB5F7] px-5 py-3.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#E5DF98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{loading ? 'Verifying...' : 'Verify code'}</span>

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
          For your security, never share your verification code with
          anyone.
        </p>
      </form>
    </section>
  );
}