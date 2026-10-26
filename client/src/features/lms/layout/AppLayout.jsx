import { useEffect, useMemo, useState } from 'react';
import {
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import useAuth from '../../auth/context/useAuth.js';

import { getRoleNavigation } from '../config/role-navigation.js';

import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

function getPageInformation(pathname, navigation) {
  const matchedItem = navigation.find(
    (item) =>
      pathname === item.path ||
      pathname.startsWith(`${item.path}/`),
  );

  if (matchedItem) {
    return {
      title: matchedItem.label,
      subtitle: 'Manage your academic workspace',
    };
  }

  return {
    title: 'Aacharya LMS',
    subtitle: 'Learning Management System',
  };
}

function getDisplayName(user) {
  return (
    user?.fullName ||
    user?.name ||
    user?.institutionalId ||
    'Account'
  );
}

function SessionLoadingView() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#14161C] px-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#CDB5F7] text-xl font-extrabold text-[#14161C]"
        >
          A
        </div>

        <p className="text-sm text-[#A4A4AF]">
          Restoring your session...
        </p>
      </div>
    </div>
  );
}

export default function AppLayout({
  onLogout,
  onSearch,
  onNotificationsClick,
  notificationCount = 0,
}) {
  const auth = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const user = auth.user;
  const role = user?.role || '';

  const navigation = useMemo(
    () => getRoleNavigation(role),
    [role],
  );

  const pageInformation = useMemo(
    () =>
      getPageInformation(
        location.pathname,
        navigation,
      ),
    [location.pathname, navigation],
  );

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSidebarOpen]);

  function handleProfileClick() {
    const profileItem = navigation.find(
      (item) => item.id === 'profile',
    );

    if (profileItem) {
      navigate(profileItem.path);
    }
  }

  async function handleLogout() {
    if (onLogout) {
      await onLogout();
      return;
    }

    await auth.logout();

    navigate('/', {
      replace: true,
    });
  }

  if (auth.loading) {
    return <SessionLoadingView />;
  }

  return (
    <div className="min-h-screen bg-[#14161C] text-[#EAEAE6]">
      <a
        href="#main-content"
        className={[
          'sr-only z-[100] rounded-lg bg-[#CDB5F7]',
          'px-4 py-3 font-semibold text-[#14161C]',
          'focus:not-sr-only focus:fixed focus:left-4 focus:top-4',
          'focus:outline-none focus:ring-2 focus:ring-[#E5DF98]',
        ].join(' ')}
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen">
        <Sidebar
          role={role}
          isOpen={isSidebarOpen}
          onNavigate={() => setIsSidebarOpen(false)}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar
            title={pageInformation.title}
            subtitle={pageInformation.subtitle}
            user={{
              name: getDisplayName(user),
              role:
                typeof role === 'string'
                  ? role.replaceAll('_', ' ')
                  : '',
            }}
            notificationCount={notificationCount}
            onMenuClick={() => setIsSidebarOpen(true)}
            onSearch={onSearch}
            onNotificationsClick={onNotificationsClick}
            onProfileClick={handleProfileClick}
            onLogout={handleLogout}
          />

          <main
            id="main-content"
            tabIndex={-1}
            className="min-w-0 flex-1 outline-none"
          >
            <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}