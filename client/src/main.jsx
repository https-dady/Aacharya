import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';

import App from './App.jsx';
import AppRouter from './app/router.jsx';
import { applicationRoutes } from './app/app-routes.jsx';
import { AuthProvider } from './features/auth/context/AuthContext.jsx';

function RootApplication() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter routes={applicationRoutes}>
          <App />
        </AppRouter>
      </AuthProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApplication />
  </StrictMode>,
);