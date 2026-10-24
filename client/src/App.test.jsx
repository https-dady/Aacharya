import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import { AuthProvider } from './features/auth/context/AuthContext.jsx';
import authService from './features/auth/services/authService.js';

vi.mock('./features/auth/services/authService.js', () => ({
  default: {
    refreshToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    requestEmailVerification: vi.fn(),
    confirmEmailVerification: vi.fn(),
    requestPasswordReset: vi.fn(),
    verifyPasswordResetOtp: vi.fn(),
    confirmPasswordReset: vi.fn(),
  },
}));

function renderApp() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>,
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('App authentication', () => {
  it('renders the login screen when no session exists', async () => {
    authService.refreshToken.mockRejectedValueOnce(
      new Error('No active session'),
    );

    renderApp();

    await waitFor(() => {
      expect(
        screen.queryByText('Restoring your session...'),
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it('restores the authenticated user after refresh', async () => {
    authService.refreshToken.mockResolvedValueOnce({
      success: true,
      data: {
        accessToken: 'test-access-token',
        user: {
          id: 'user-1',
          institutionalId: 'STU001',
          fullName: 'Test Student',
          email: 'student@example.com',
          role: 'STUDENT',
          isEmailVerified: true,
        },
      },
    });

    renderApp();

    expect(
      await screen.findByText('Welcome,'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Test Student.'),
    ).toBeInTheDocument();

    expect(sessionStorage.getItem('aacharya_access_token')).toBe(
      'test-access-token',
    );
  });

  it('shows the login screen if the refresh session is invalid', async () => {
    authService.refreshToken.mockRejectedValueOnce(
      new Error('Invalid refresh session'),
    );

    renderApp();

    expect(
      await screen.findByRole('button', { name: /sign in/i }),
    ).toBeInTheDocument();

    expect(sessionStorage.getItem('aacharya_access_token')).toBeNull();
  });
});