import { useState } from 'react';

import './App.css';

import Login from './features/auth/pages/Login.jsx';
import ForgotPassword from './features/auth/pages/ForgotPassword.jsx';
import VerifyResetOtp from './features/auth/pages/VerifyResetOtp.jsx';
import ResetPassword from './features/auth/pages/ResetPassword.jsx';
import EmailVerification from './features/auth/pages/EmailVerification.jsx';

import authService from './features/auth/services/authService.js';

const INITIAL_LOGIN_FORM = {
  institutionalId: '',
  password: '',
};

const INITIAL_RECOVERY_STATE = {
  email: '',
  challengeId: '',
  resetToken: '',
};

function getResponseData(response) {
  return response?.data ?? response;
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
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
        <span className="brand-caption">
          LEARNING MANAGEMENT SYSTEM
        </span>
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
        <span className="floating-icon floating-icon-lavender">
          A
        </span>

        <span>
          <strong>Learn with purpose</strong>
          <small>Every day is progress.</small>
        </span>
      </div>

      <div className="grid-floating-card floating-card-two">
        <span className="floating-icon floating-icon-butter">
          ✓
        </span>

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

function AuthenticatedView({ user, onLogout, loading, error }) {
  const fullName = user?.fullName || 'User';
  const role = user?.role || 'Account';

  return (
    <section className="w-full max-w-md">
      <div className="mb-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#E5DF98]" />

          <span className="text-[10px] font-semibold tracking-[0.18em] text-[#CDB5F7]">
            ACCOUNT ACCESS
          </span>
        </div>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#EAEAE6] sm:text-5xl">
          Welcome,
          <br />
          <span className="break-words text-[#CDB5F7]">
            {fullName}.
          </span>
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#A4A4AF]">
          You are signed in to Aacharya LMS.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
        <div>
          <p className="text-xs text-[#858590]">Full name</p>
          <p className="mt-1 break-words text-sm font-medium text-[#EAEAE6]">
            {fullName}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#858590]">Institutional ID</p>
          <p className="mt-1 break-words text-sm font-medium text-[#EAEAE6]">
            {user?.institutionalId || 'Not available'}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#858590]">Role</p>
          <p className="mt-1 text-sm font-medium text-[#E5DF98]">
            {role}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#858590]">Email</p>
          <p className="mt-1 break-all text-sm font-medium text-[#EAEAE6]">
            {user?.email || 'Not available'}
          </p>
        </div>

        {!user?.isEmailVerified && (
          <div className="rounded-xl border border-[#E5DF98]/20 bg-[#E5DF98]/5 p-4">
            <p className="text-sm font-medium text-[#E5DF98]">
              Email verification required
            </p>

            <p className="mt-1 text-xs leading-5 text-[#A4A4AF]">
              Verify your registered email address to complete this
              account step.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onLogout}
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl border border-[#383943] px-5 py-3 text-sm font-semibold text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </section>
  );
}

export default function App() {
  const [screen, setScreen] = useState('login');

  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN_FORM);

  const [recovery, setRecovery] = useState(INITIAL_RECOVERY_STATE);

  const [emailVerificationChallengeId, setEmailVerificationChallengeId] =
    useState('');

  const [emailVerificationOtp, setEmailVerificationOtp] = useState('');

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

  function updateRecovery(updates) {
    setRecovery((current) => ({
      ...current,
      ...updates,
    }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const response = await authService.login({
        institutionalId: loginForm.institutionalId.trim(),
        password: loginForm.password,
      });

      const data = getResponseData(response);

      if (!data?.accessToken || !data?.user) {
        throw new Error(
          'The server response is missing the account or access token.',
        );
      }

      sessionStorage.setItem(
        'aacharya_access_token',
        data.accessToken,
      );

      setUser(data.user);
      setLoginForm(INITIAL_LOGIN_FORM);

      if (data.user.isEmailVerified === false) {
        setEmailVerificationChallengeId('');
        setEmailVerificationOtp('');
        switchScreen('email-verification');
      } else {
        switchScreen('authenticated');
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPasswordReset(event, email) {
    event.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const response = await authService.requestPasswordReset({
        email: email.trim(),
      });

      const data = getResponseData(response);

      if (!data?.challengeId) {
        throw new Error(
          'The reset request did not return a verification challenge.',
        );
      }

      updateRecovery({
        email: email.trim(),
        challengeId: data.challengeId,
        resetToken: '',
      });

      switchScreen('verify-reset-otp');

      setSuccess(
        'If your account is eligible, a verification code has been sent.',
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyResetOtp({ challengeId, otp }) {
    clearFeedback();
    setLoading(true);

    try {
      const response = await authService.verifyPasswordResetOtp({
        challengeId,
        otp,
      });

      const data = getResponseData(response);

      if (!data?.resetToken) {
        throw new Error(
          'The verification response did not contain a reset token.',
        );
      }

      updateRecovery({
        resetToken: data.resetToken,
      });

      switchScreen('reset-password');

      setSuccess(
        'Code verified. You can now choose a new password.',
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPasswordReset({ resetToken, newPassword }) {
    clearFeedback();
    setLoading(true);

    try {
      await authService.confirmPasswordReset({
        resetToken,
        newPassword,
      });

      setRecovery(INITIAL_RECOVERY_STATE);
      setLoginForm(INITIAL_LOGIN_FORM);

      switchScreen('login');

      setSuccess(
        'Password reset successfully. Sign in with your new password.',
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestEmailVerification() {
    clearFeedback();
    setLoading(true);

    try {
      const response = await authService.requestEmailVerification();
      const data = getResponseData(response);

      if (!data?.challengeId) {
        throw new Error(
          'The server did not return an email verification challenge.',
        );
      }

      setEmailVerificationChallengeId(data.challengeId);
      setEmailVerificationOtp('');

      setSuccess('Verification code requested successfully.');

      return data.challengeId;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      throw requestError;
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmail({ challengeId, otp }) {
    clearFeedback();
    setLoading(true);

    try {
      await authService.confirmEmailVerification({
        challengeId,
        otp,
      });

      setUser((current) =>
        current
          ? {
              ...current,
              isEmailVerified: true,
            }
          : current,
      );

      setEmailVerificationOtp('');
      setEmailVerificationChallengeId('');

      switchScreen('authenticated');

      setSuccess('Your email address has been verified.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    clearFeedback();
    setLoading(true);

    try {
      await authService.logout();
    } catch {
      // Local authentication state is cleared even if logout cannot
      // reach the server. The server-side refresh session may remain
      // valid until it expires or is revoked separately.
    } finally {
      sessionStorage.removeItem('aacharya_access_token');

      setUser(null);
      setLoginForm(INITIAL_LOGIN_FORM);
      setRecovery(INITIAL_RECOVERY_STATE);
      setEmailVerificationChallengeId('');
      setEmailVerificationOtp('');

      setLoading(false);
      switchScreen('login');

      setSuccess('You have been signed out.');
    }
  }

  function openForgotPassword() {
    setRecovery(INITIAL_RECOVERY_STATE);
    switchScreen('forgot-password');
  }

  function backToLogin() {
    switchScreen('login');
  }

  const isAuthenticatedScreen =
    screen === 'authenticated' ||
    screen === 'email-verification';

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
            {isAuthenticatedScreen
              ? 'YOUR ACCOUNT'
              : 'ACCOUNT ACCESS'}
          </span>

          <span className="system-status">
            <span className="system-status-dot" />
            SYSTEM READY
          </span>
        </div>

        <div className="auth-card">
          {screen === 'login' && (
            <Login
              form={loginForm}
              setForm={setLoginForm}
              onSubmit={handleLogin}
              loading={loading}
              error={error}
              success={success}
              onForgotPassword={openForgotPassword}
            />
          )}

          {screen === 'forgot-password' && (
            <ForgotPassword
              email={recovery.email}
              onSubmit={handleRequestPasswordReset}
              onBackToLogin={backToLogin}
              loading={loading}
              error={error}
              success={success}
            />
          )}

          {screen === 'verify-reset-otp' && (
            <VerifyResetOtp
              email={recovery.email}
              challengeId={recovery.challengeId}
              onSubmit={handleVerifyResetOtp}
              onBack={() => switchScreen('forgot-password')}
              loading={loading}
              error={error}
              success={success}
            />
          )}

          {screen === 'reset-password' && (
            <ResetPassword
              resetToken={recovery.resetToken}
              onSubmit={handleConfirmPasswordReset}
              onBackToLogin={backToLogin}
              loading={loading}
              error={error}
              success={success}
            />
          )}

          {screen === 'email-verification' && (
            <EmailVerification
              email={user?.email || ''}
              challengeId={emailVerificationChallengeId}
              onRequestCode={handleRequestEmailVerification}
              onSubmit={handleVerifyEmail}
              loading={loading}
              error={error}
              success={success}
              isVerified={Boolean(user?.isEmailVerified)}
            />
          )}

          {screen === 'authenticated' && (
            <AuthenticatedView
              user={user}
              onLogout={handleLogout}
              loading={loading}
              error={error}
            />
          )}
        </div>

        <AuthFooter />
      </section>
    </main>
  );
}