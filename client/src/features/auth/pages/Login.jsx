import { useState } from 'react';

const INITIAL_LOGIN_FORM = {
  institutionalId: '',
  password: '',
};

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  maxLength,
  autoFocus = false,
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>

      <input
        id={id}
        name={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        maxLength={maxLength}
        autoFocus={autoFocus}
      />
    </div>
  );
}

function PasswordField({
  value,
  onChange,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="form-field">
      <label htmlFor="password">Password</label>

      <div className="password-input-wrap">
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
        />

        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

function PrimaryButton({ children, loading, disabled = false }) {
  return (
    <button
      className="primary-button"
      type="submit"
      disabled={disabled || loading}
    >
      <span>{loading ? 'Please wait...' : children}</span>

      {!loading && (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
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
  );
}

function Feedback({ error, success }) {
  if (!error && !success) {
    return null;
  }

  return (
    <div
      className={`form-feedback ${
        error ? 'feedback-error' : 'feedback-success'
      }`}
      role={error ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="feedback-indicator" aria-hidden="true">
        {error ? '!' : '✓'}
      </span>

      <span>{error || success}</span>
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
    <>
      <div className="form-heading">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          YOUR CAMPUS, CONNECTED
        </div>

        <h1>
          Welcome
          <br />
          <span>back.</span>
        </h1>

        <p className="form-description">
          Sign in to continue your learning journey.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <Feedback error={error} success={success} />

        <Field
          label="Institutional ID"
          id="institutionalId"
          value={form.institutionalId}
          onChange={(event) =>
            handleFieldChange('institutionalId', event.target.value)
          }
          placeholder="Enter your scholar or roll number"
          autoComplete="username"
          maxLength={50}
          autoFocus
        />

        <PasswordField
          value={form.password}
          onChange={(event) =>
            handleFieldChange('password', event.target.value)
          }
        />

        <div className="form-options">
          <span className="secure-note">
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
            className="text-button"
            type="button"
            onClick={onForgotPassword}
            disabled={loading}
          >
            Forgot password?
          </button>
        </div>

        <PrimaryButton loading={loading}>
          Sign in
        </PrimaryButton>

        <p className="account-notice">
          Accounts are provided by your institution.
          <br />
          Public student registration is disabled.
        </p>
      </form>
    </>
  );
}