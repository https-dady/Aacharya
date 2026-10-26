import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

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
    () => getPageInformation(location.pathname, navigation),
    [location.pathname, navigation],
  );

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

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

    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#14161C] text-[#EAEAE6]">
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
              role: role.replaceAll('_', ' '),
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
            className="min-w-0 flex-1"
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