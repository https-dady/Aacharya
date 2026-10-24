import { useState } from 'react';

const OTP_LENGTH = 6;

export default function EmailVerification({
  email = '',
  challengeId = '',
  onRequestCode,
  onSubmit,
  loading = false,
  error = '',
  success = '',
  isVerified = false,
}) {
  const [otp, setOtp] = useState('');
  const [requestingCode, setRequestingCode] = useState(false);

  function handleOtpChange(event) {
    const value = event.target.value
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH);

    setOtp(value);
  }

  async function handleRequestCode() {
    if (!onRequestCode || requestingCode || loading || isVerified) {
      return;
    }

    setRequestingCode(true);

    try {
      await onRequestCode();
    } finally {
      setRequestingCode(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (otp.length !== OTP_LENGTH || !challengeId || isVerified) {
      return;
    }

    onSubmit?.({
      challengeId,
      otp,
    });
  }

  return (
    <section className="w-full max-w-md">
      <div className="mb-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 px-3 py-1.5">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              isVerified ? 'bg-emerald-400' : 'bg-[#E5DF98]'
            }`}
          />

          <span className="text-[10px] font-semibold tracking-[0.18em] text-[#CDB5F7]">
            EMAIL SECURITY
          </span>
        </div>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#EAEAE6] sm:text-5xl">
          Verify your
          <br />
          <span className="text-[#CDB5F7]">email.</span>
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#A4A4AF]">
          Confirm your email address to help keep your Aacharya LMS
          account secure.
        </p>

        {email && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#383943] bg-[#1D1F27] p-4">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[#CDB5F7]"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.5"
              />

              <path
                d="M4 7L12 13L20 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="min-w-0">
              <p className="text-xs text-[#858590]">
                Registered email address
              </p>

              <p className="mt-1 break-all text-sm font-medium text-[#EAEAE6]">
                {email}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm leading-5 text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm leading-5 text-emerald-300"
        >
          {success}
        </div>
      )}

      {isVerified ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 12L10 17L19 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <div>
              <p className="text-sm font-semibold text-emerald-300">
                Email verified
              </p>

              <p className="mt-1 text-xs leading-5 text-[#A4A4AF]">
                Your email verification is complete.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email-verification-otp"
              className="block text-sm font-medium text-[#EAEAE6]"
            >
              Verification code
            </label>

            <input
              id="email-verification-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={OTP_LENGTH}
              maxLength={OTP_LENGTH}
              value={otp}
              onChange={handleOtpChange}
              placeholder="000000"
              required
              disabled={loading || !challengeId}
              aria-describedby="email-otp-help"
              className="w-full rounded-xl border border-[#383943] bg-[#1D1F27] px-4 py-5 text-center font-mono text-2xl tracking-[0.65em] text-[#EAEAE6] outline-none transition-colors placeholder:text-[#50515D] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <p
              id="email-otp-help"
              className="text-xs leading-5 text-[#858590]"
            >
              Enter the six-digit code provided by the verification
              service.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== OTP_LENGTH || !challengeId}
            className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#CDB5F7] px-5 py-3.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#E5DF98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              {loading ? 'Verifying email...' : 'Verify email'}
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

          <div className="border-t border-[#383943] pt-5 text-center">
            <p className="text-xs text-[#858590]">
              Didn't receive a verification code?
            </p>

            <button
              type="button"
              onClick={handleRequestCode}
              disabled={requestingCode || loading}
              className="mt-2 rounded text-sm font-medium text-[#CDB5F7] transition-colors hover:text-[#E5DF98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {requestingCode ? 'Requesting code...' : 'Request a new code'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}