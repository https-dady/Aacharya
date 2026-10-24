import { useState } from 'react';

const INITIAL_LOGIN_FORM = {
  institutionalId: '',
  password: '',
};

function PasswordInput({ value, onChange, disabled }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label
        htmlFor="password"
        className="block text-sm font-medium text-[#EAEAE6]"
      >
        Password
      </label>

      <div className="flex items-center rounded-xl border border-[#383943] bg-[#1D1F27] transition-colors focus-within:border-[#CDB5F7]">
        <input
          id="password"
          name="password"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          maxLength={256}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm text-[#EAEAE6] outline-none placeholder:text-[#858590] disabled:cursor-not-allowed disabled:opacity-60"
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="mr-3 rounded-lg px-2 py-1 text-xs font-medium text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CDB5F7] disabled:cursor-not-allowed"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

function FormFeedback({ error, success }) {
  if (!error && !success) {
    return null;
  }

  const isError = Boolean(error);

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      className={[
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        isError
          ? 'border-red-400/25 bg-red-400/10 text-red-300'
          : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold"
      >
        {isError ? '!' : '✓'}
      </span>

      <p className="break-words">{error || success}</p>
    </div>
  );
}

export default function Login({
  form = INITIAL_LOGIN_FORM,
  setForm,
  onSubmit,
  loading = false,
  error = '',
  success = '',
  onForgotPassword,
}) {
  function handleFieldChange(field, value) {
    if (!setForm) {
      return;
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (onSubmit) {
      onSubmit(event);
    }
  }

  return (
    <section className="w-full max-w-md">
      <div className="mb-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 px-3 py-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[#E5DF98]"
          />

          <span className="text-[10px] font-semibold tracking-[0.18em] text-[#CDB5F7]">
            YOUR CAMPUS, CONNECTED
          </span>
        </div>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#EAEAE6] sm:text-5xl">
          Welcome
          <br />
          <span className="text-[#CDB5F7]">back.</span>
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#A4A4AF]">
          Sign in to continue your learning journey.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormFeedback error={error} success={success} />

        <div className="space-y-2">
          <label
            htmlFor="institutionalId"
            className="block text-sm font-medium text-[#EAEAE6]"
          >
            Institutional ID
          </label>

          <input
            id="institutionalId"
            name="institutionalId"
            type="text"
            value={form.institutionalId}
            onChange={(event) =>
              handleFieldChange('institutionalId', event.target.value)
            }
            placeholder="Enter your scholar or roll number"
            autoComplete="username"
            autoCapitalize="characters"
            spellCheck={false}
            required
            maxLength={50}
            autoFocus
            disabled={loading}
            className="w-full rounded-xl border border-[#383943] bg-[#1D1F27] px-4 py-3.5 text-sm text-[#EAEAE6] outline-none transition-colors placeholder:text-[#858590] hover:border-[#50515D] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/10 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <PasswordInput
          value={form.password}
          onChange={(event) =>
            handleFieldChange('password', event.target.value)
          }
          disabled={loading}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs text-[#A4A4AF]">
            <svg
              viewBox="0 0 16 16"
              width="15"
              height="15"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="7"
                width="10"
                height="7"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.3"
              />

              <path
                d="M5 7V4.8a3 3 0 0 1 6 0V7"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>

            Secure sign-in
          </span>

          <button
            type="button"
            onClick={onForgotPassword}
            disabled={loading}
            className="rounded text-sm font-medium text-[#CDB5F7] transition-colors hover:text-[#E5DF98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#CDB5F7] px-5 py-3.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#E5DF98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{loading ? 'Signing in...' : 'Sign in'}</span>

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

        <p className="pt-2 text-center text-xs leading-5 text-[#858590]">
          Accounts are provided by your institution.
          <br />
          Public student registration is disabled.
        </p>
      </form>
    </section>
  );
}