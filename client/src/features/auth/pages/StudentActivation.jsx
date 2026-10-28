import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../services/authService.js';

export default function StudentActivation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [challengeId] = useState(
    () => searchParams.get('challengeId') ?? '',
  );

  const [activationToken] = useState(
    () => searchParams.get('token') ?? '',
  );

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    // Remove the sensitive activation token from the visible URL
    // and browser history without navigating away from this page.
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname,
    );
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!challengeId || !activationToken) {
      setError(
        'Activation link invalid hai. Mentor se naya activation email mangwao.',
      );
      return;
    }

    if (password.length < 8) {
      setError('Password kam se kam 8 characters ka hona chahiye.');
      return;
    }

    if (new TextEncoder().encode(password).length > 72) {
      setError('Password maximum 72 bytes ka ho sakta hai.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Dono passwords match nahi kar rahe.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.activateStudentAccount({
        challengeId,
        activationToken,
        newPassword: password,
      });

      setIsActivated(true);
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error?.message ||
        requestError?.message ||
        'Account activate nahi ho paya. Dobara try karo.';

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#14161C] px-4 py-10 font-sans text-[#EAEAE6]">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1B1E26] p-6 shadow-2xl sm:p-8">
        <div className="mb-7">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#CDB5F7]">
            Aacharya LMS
          </p>

          <h1 className="text-2xl font-bold">
            {isActivated ? 'Account Activated' : 'Activate Your Account'}
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#EAEAE6]/65">
            {isActivated
              ? 'Tumhara account activate ho gaya hai. Ab apne naye password se login kar sakte ho.'
              : 'Apna password set karo, phir tum apne student account mein login kar paoge.'}
          </p>
        </div>

        {isActivated ? (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full rounded-xl bg-[#CDB5F7] px-4 py-3 font-semibold text-[#14161C] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#CDB5F7] focus:ring-offset-2 focus:ring-offset-[#1B1E26]"
          >
            Go to Login
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="activation-password"
                className="mb-2 block text-sm font-medium"
              >
                New Password
              </label>

              <input
                id="activation-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-white/10 bg-[#14161C] px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-[#CDB5F7] disabled:opacity-60"
                placeholder="At least 8 characters"
              />

              <p className="mt-2 text-xs text-[#EAEAE6]/50">
                Minimum 8 characters; maximum 72 bytes.
              </p>
            </div>

            <div>
              <label
                htmlFor="activation-confirm-password"
                className="mb-2 block text-sm font-medium"
              >
                Confirm Password
              </label>

              <input
                id="activation-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-white/10 bg-[#14161C] px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-[#CDB5F7] disabled:opacity-60"
                placeholder="Enter password again"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#CDB5F7] px-4 py-3 font-semibold text-[#14161C] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Activating Account...' : 'Activate Account'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}