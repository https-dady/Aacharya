import { useState } from 'react';
import './App.css';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
).replace(/\/+$/, '');

const INITIAL_LOGIN_FORM = {
  institutionalId: '',
  password: '',
};

const INITIAL_RESET_FORM = {
  email: '',
  otp: '',
  newPassword: '',
  confirmPassword: '',
};

async function apiRequest(path, { method = 'POST', body, token } = {}) {
  const headers = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(
      'Unable to connect to Aacharya LMS. Please check whether the backend is running.',
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.error?.message ||
        result.message ||
        'Something went wrong. Please try again.',
    );
  }

  return result;
}

function getResponseData(result) {
  return result?.data ?? result;
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="13" fill="#CDB5F7" />
        <path
          d="M11 27.5V12.5H15.5L25 23.1V12.5H29V27.5H24.7L15 16.8V27.5H11Z"
          fill="#14161C"
        />
      </svg>
    </div>
  );
}

function BrandHeader() {
  return (
    <a className="brand" href="/" aria-label="Aacharya LMS home">
      <BrandMark />

      <span className="brand-copy">
        <span className="brand-name">aacharya</span>
        <span className="brand-caption">LEARNING MANAGEMENT SYSTEM</span>
      </span>
    </a>
  );
}

function DecorativeGrid() {
  return (
    <div className="decorative-grid" aria-hidden="true">
      <div className="grid-orbit grid-orbit-one" />
      <div className="grid-orbit grid-orbit-two" />
      <div className="grid-orbit grid-orbit-three" />

      <div className="grid-floating-card floating-card-one">
        <span className="floating-icon floating-icon-lavender">A</span>
        <span>
          <strong>Learn with purpose</strong>
          <small>Every day is progress.</small>
        </span>
      </div>

      <div className="grid-floating-card floating-card-two">
        <span className="floating-icon floating-icon-butter">✓</span>
        <span>
          <strong>Your journey, organized</strong>
          <small>One place for your academics.</small>
        </span>
      </div>

      <div className="grid-center-symbol">
        <div className="symbol-ring symbol-ring-outer" />
        <div className="symbol-ring symbol-ring-inner" />

        <svg
          className="symbol-book"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 30C40 23 28 22 17 26V66C29 62 41 64 50 71V30Z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M50 30C60 23 72 22 83 26V66C71 62 59 64 50 71V30Z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M50 30V71"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M26 37L39 40M26 46L39 49M61 40L74 37M61 49L74 46"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        <span className="symbol-dot symbol-dot-one" />
        <span className="symbol-dot symbol-dot-two" />
        <span className="symbol-dot symbol-dot-three" />
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  maxLength,
  autoFocus = false,
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        maxLength={maxLength}
        autoFocus={autoFocus}
      />
    </div>
  );
}

function PasswordField({
  label,
  id,
  value,
  onChange,
  placeholder = 'Enter your password',
  autoComplete = 'current-password',
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>

      <div className="password-input-wrap">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
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
      className={`form-feedback ${error ? 'feedback-error' : 'feedback-success'}`}
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

function AuthFooter() {
  return (
    <footer className="auth-footer">
      <span>© {new Date().getFullYear()} Aacharya LMS</span>

      <span className="footer-separator" aria-hidden="true">
        ·
      </span>

      <span>Built for learning.</span>
    </footer>
  );
}

function LoginForm({
  onSubmit,
  form,
  setForm,
  loading,
  error,
  success,
  onForgotPassword,
}) {
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

      <form className="auth-form" onSubmit={onSubmit}>
        <Feedback error={error} success={success} />

        <Field
          label="Institutional ID"
          id="institutionalId"
          value={form.institutionalId}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              institutionalId: event.target.value,
            }))
          }
          placeholder="Enter your scholar or roll number"
          autoComplete="username"
          maxLength={50}
          autoFocus
        />

        <PasswordField
          label="Password"
          id="password"
          value={form.password}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              password: event.target.value,
            }))
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
          >
            Forgot password?
          </button>
        </div>

        <PrimaryButton loading={loading}>Sign in</PrimaryButton>

        <p className="account-notice">
          Accounts are provided by your institution.
          <br />
          Public student registration is disabled.
        </p>
      </form>
    </>
  );
}

function ForgotPasswordForm({
  step,
  setStep,
  form,
  setForm,
  loading,
  error,
  success,
  onRequestOtp,
  onVerifyOtp,
  onResetPassword,
  onBack,
}) {
  if (step === 'request') {
    return (
      <>
        <div className="form-heading">
          <button className="back-button" type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Back to sign in
          </button>

          <div className="step-icon">01</div>

          <h1>
            Forgot
            <br />
            <span>password?</span>
          </h1>

          <p className="form-description">
            Enter the verified email address linked to your institutional
            account. We&apos;ll send you a one-time code.
          </p>
        </div>

        <form className="auth-form" onSubmit={onRequestOtp}>
          <Feedback error={error} success={success} />

          <Field
            label="Registered email address"
            id="resetEmail"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            placeholder="you@college.edu"
            autoComplete="email"
            maxLength={254}
            autoFocus
          />

          <PrimaryButton loading={loading}>Send verification code</PrimaryButton>

          <p className="account-notice">
            For your security, the response does not disclose whether an
            account exists.
          </p>
        </form>
      </>
    );
  }

  if (step === 'verify') {
    return (
      <>
        <div className="form-heading">
          <button
            className="back-button"
            type="button"
            onClick={() => setStep('request')}
          >
            <span aria-hidden="true">←</span> Change email
          </button>

          <div className="step-icon">02</div>

          <h1>
            Check your
            <br />
            <span>inbox.</span>
          </h1>

          <p className="form-description">
            Enter the six-digit code sent to your registered email address.
            The code expires after 10 minutes.
          </p>
        </div>

        <form className="auth-form" onSubmit={onVerifyOtp}>
          <Feedback error={error} success={success} />

          <Field
            label="Six-digit verification code"
            id="resetOtp"
            value={form.otp}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                otp: event.target.value.replace(/\D/g, '').slice(0, 6),
              }))
            }
            placeholder="000000"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
          />

          <PrimaryButton
            loading={loading}
            disabled={!/^\d{6}$/.test(form.otp)}
          >
            Verify code
          </PrimaryButton>

          <p className="account-notice">
            Never share your verification code with anyone.
          </p>
        </form>
      </>
    );
  }

  return (
    <>
      <div className="form-heading">
        <button
          className="back-button"
          type="button"
          onClick={() => setStep('verify')}
        >
          <span aria-hidden="true">←</span> Back to verification
        </button>

        <div className="step-icon">03</div>

        <h1>
          Make it
          <br />
          <span>secure.</span>
        </h1>

        <p className="form-description">
          Choose a new password for your Aacharya LMS account.
        </p>
      </div>

      <form className="auth-form" onSubmit={onResetPassword}>
        <Feedback error={error} success={success} />

        <PasswordField
          label="New password"
          id="newPassword"
          value={form.newPassword}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              newPassword: event.target.value,
            }))
          }
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />

        <PasswordField
          label="Confirm new password"
          id="confirmPassword"
          value={form.confirmPassword}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              confirmPassword: event.target.value,
            }))
          }
          placeholder="Enter your new password again"
          autoComplete="new-password"
        />

        <p className="password-hint">
          Use at least 8 characters. Choose a password you don&apos;t use
          elsewhere.
        </p>

        <PrimaryButton
          loading={loading}
          disabled={
            form.newPassword.length < 8 ||
            form.newPassword !== form.confirmPassword
          }
        >
          Reset password
        </PrimaryButton>
      </form>
    </>
  );
}

function EmailVerificationForm({
  loading,
  error,
  success,
  otp,
  setOtp,
  onRequestOtp,
  onVerifyOtp,
  onLogout,
}) {
  const [challengeId, setChallengeId] = useState('');

  async function requestCode(event) {
    const result = await onRequestOtp(event);

    if (result?.challengeId) {
      setChallengeId(result.challengeId);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    await onVerifyOtp(event, challengeId);
  }

  return (
    <>
      <div className="form-heading">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          ACCOUNT SECURITY
        </div>

        <div className="step-icon">✓</div>

        <h1>
          Verify your
          <br />
          <span>email.</span>
        </h1>

        <p className="form-description">
          Your account is signed in, but your email address still needs
          verification before it can be used for official email delivery.
        </p>
      </div>

      <div className="auth-form">
        <Feedback error={error} success={success} />

        {!challengeId ? (
          <form onSubmit={requestCode}>
            <PrimaryButton loading={loading}>
              Send verification code
            </PrimaryButton>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <Field
              label="Six-digit verification code"
              id="emailVerificationOtp"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="000000"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
            />

            <PrimaryButton
              loading={loading}
              disabled={!/^\d{6}$/.test(otp)}
            >
              Verify email
            </PrimaryButton>
          </form>
        )}

        <button className="secondary-button" type="button" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </>
  );
}

function AuthenticatedView({ user, onLogout }) {
  const displayName = user?.fullName || user?.name || 'Aacharya member';
  const role = user?.role?.replaceAll('_', ' ') || 'MEMBER';
  const firstName = displayName.trim().split(/\s+/)[0];

  return (
    <div className="authenticated-view">
      <div className="success-mark" aria-hidden="true">
        ✓
      </div>

      <div className="eyebrow">
        <span className="eyebrow-dot" />
        AUTHENTICATION SUCCESSFUL
      </div>

      <h1>
        You&apos;re in,
        <br />
        <span>{firstName}.</span>
      </h1>

      <p className="form-description">
        Your account has been authenticated successfully. Your academic
        workspace is ready for the next step.
      </p>

      <div className="account-card">
        <div className="account-avatar" aria-hidden="true">
          {firstName.charAt(0).toUpperCase()}
        </div>

        <div className="account-card-copy">
          <strong>{displayName}</strong>
          <span>{user?.institutionalId || 'Institutional account'}</span>
        </div>

        <span className="role-badge">{role}</span>
      </div>

      <button className="primary-button logout-button" onClick={onLogout}>
        <span>Sign out securely</span>
        <span aria-hidden="true">↗</span>
      </button>

      <p className="account-notice">
        Authentication is connected. The role-specific dashboard will be
        integrated in its planned phase.
      </p>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState('login');
  const [resetStep, setResetStep] = useState('request');

  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN_FORM);
  const [resetForm, setResetForm] = useState(INITIAL_RESET_FORM);

  const [challengeId, setChallengeId] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [emailVerificationOtp, setEmailVerificationOtp] = useState('');

  const [accessToken, setAccessToken] = useState('');
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function clearFeedback() {
    setError('');
    setSuccess('');
  }

  function switchScreen(nextScreen) {
    clearFeedback();
    setScreen(nextScreen);
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const result = await apiRequest('/auth/login', {
        body: {
          institutionalId: loginForm.institutionalId.trim(),
          password: loginForm.password,
        },
      });

      const data = getResponseData(result);
      const token = data.accessToken;
      const authenticatedUser = data.user;

      if (!token || !authenticatedUser) {
        throw new Error(
          'The server response is missing the account or access token.',
        );
      }

      setAccessToken(token);
      setUser(authenticatedUser);
      setLoginForm(INITIAL_LOGIN_FORM);

      if (authenticatedUser.isEmailVerified === false) {
        setEmailVerificationOtp('');
        switchScreen('email-verification');
      } else {
        switchScreen('authenticated');
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestReset(event) {
    event.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const result = await apiRequest('/auth/password/reset/request', {
        body: {
          email: resetForm.email.trim(),
        },
      });

      const data = getResponseData(result);

      if (!data.challengeId) {
        throw new Error(
          'The reset request was accepted, but no challenge ID was returned. Please check the API response.',
        );
      }

      setChallengeId(data.challengeId);
      setResetStep('verify');
      setSuccess('If your account is eligible, a verification code has been sent.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyResetOtp(event) {
    event.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const result = await apiRequest('/auth/password/reset/verify', {
        body: {
          challengeId,
          otp: resetForm.otp,
        },
      });

      const data = getResponseData(result);

      if (!data.resetToken) {
        throw new Error(
          'The verification response did not contain a reset token.',
        );
      }

      setResetToken(data.resetToken);
      setResetForm((current) => ({
        ...current,
        otp: '',
      }));
      setResetStep('new-password');
      setSuccess('Code verified. You can now choose a new password.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmReset(event) {
    event.preventDefault();
    clearFeedback();

    if (resetForm.newPassword.length < 8) {
      setError('Your new password must contain at least 8 characters.');
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await apiRequest('/auth/password/reset/confirm', {
        body: {
          resetToken,
          newPassword: resetForm.newPassword,
        },
      });

      setResetForm(INITIAL_RESET_FORM);
      setChallengeId('');
      setResetToken('');
      setResetStep('request');

      setScreen('login');
      setSuccess('Password reset successfully. Sign in with your new password.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestEmailVerification(event) {
    event.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const result = await apiRequest('/auth/email/verification/request', {
        token: accessToken,
        body: {},
      });

      const data = getResponseData(result);

      return {
        challengeId: data.challengeId,
      };
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmail(event, verificationChallengeId) {
    event.preventDefault();
    clearFeedback();

    if (!verificationChallengeId) {
      setError('Request a verification code first.');
      return;
    }

    setLoading(true);

    try {
      await apiRequest('/auth/email/verification/confirm', {
        token: accessToken,
        body: {
          challengeId: verificationChallengeId,
          otp: emailVerificationOtp,
        },
      });

      setUser((current) =>
        current ? { ...current, isEmailVerified: true } : current,
      );

      setEmailVerificationOtp('');
      switchScreen('authenticated');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    clearFeedback();
    setLoading(true);

    try {
      await apiRequest('/auth/logout');
    } catch {
      // Clear the local authenticated view even if the network is unavailable.
      // The server-side session may still need to expire or be revoked separately.
    } finally {
      setAccessToken('');
      setUser(null);
      setLoginForm(INITIAL_LOGIN_FORM);
      setResetForm(INITIAL_RESET_FORM);
      setChallengeId('');
      setResetToken('');
      setEmailVerificationOtp('');
      setResetStep('request');
      setLoading(false);
      switchScreen('login');
      setSuccess('You have been signed out.');
    }
  }

  function openForgotPassword() {
    setResetForm(INITIAL_RESET_FORM);
    setChallengeId('');
    setResetToken('');
    setResetStep('request');
    switchScreen('forgot-password');
  }

  const isAuthenticatedScreen =
    screen === 'authenticated' || screen === 'email-verification';

  return (
    <main className="auth-shell">
      <section className="auth-visual" aria-label="About Aacharya LMS">
        <div className="visual-top">
          <BrandHeader />

          <span className="platform-label">
            <span className="platform-status-dot" />
            ACADEMIC WORKSPACE
          </span>
        </div>

        <div className="visual-content">
          <div className="visual-kicker">
            <span className="kicker-line" />
            A BETTER WAY TO LEARN
          </div>

          <h2>
            Your potential.
            <br />
            <span>Our platform.</span>
            <br />
            Your future.
          </h2>

          <p className="visual-description">
            A connected academic experience designed to help students,
            faculty, and mentors move forward together.
          </p>

          <DecorativeGrid />

          <div className="visual-bottom">
            <div className="visual-bottom-line" />

            <div>
              <span className="visual-bottom-title">
                Built around your journey.
              </span>
              <span className="visual-bottom-caption">
                Learn · Collaborate · Grow
              </span>
            </div>

            <span className="visual-edition">EDITION 01</span>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-label="Account access">
        <div className="mobile-brand">
          <BrandHeader />
        </div>

        <div className="auth-panel-top">
          <span className="panel-context">
            {isAuthenticatedScreen ? 'YOUR ACCOUNT' : 'ACCOUNT ACCESS'}
          </span>

          <span className="system-status">
            <span className="system-status-dot" />
            SYSTEM READY
          </span>
        </div>

        <div className="auth-card">
          {screen === 'login' && (
            <LoginForm
              onSubmit={handleLogin}
              form={loginForm}
              setForm={setLoginForm}
              loading={loading}
              error={error}
              success={success}
              onForgotPassword={openForgotPassword}
            />
          )}

          {screen === 'forgot-password' && (
            <ForgotPasswordForm
              step={resetStep}
              setStep={(step) => {
                clearFeedback();
                setResetStep(step);
              }}
              form={resetForm}
              setForm={setResetForm}
              loading={loading}
              error={error}
              success={success}
              onRequestOtp={handleRequestReset}
              onVerifyOtp={handleVerifyResetOtp}
              onResetPassword={handleConfirmReset}
              onBack={() => switchScreen('login')}
            />
          )}

          {screen === 'email-verification' && (
            <EmailVerificationForm
              loading={loading}
              error={error}
              success={success}
              otp={emailVerificationOtp}
              setOtp={setEmailVerificationOtp}
              onRequestOtp={handleRequestEmailVerification}
              onVerifyOtp={handleVerifyEmail}
              onLogout={handleLogout}
            />
          )}

          {screen === 'authenticated' && (
            <AuthenticatedView user={user} onLogout={handleLogout} />
          )}
        </div>

        <AuthFooter />
      </section>
    </main>
  );
}

export default App;