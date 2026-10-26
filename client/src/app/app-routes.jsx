import AppLayout from '../features/lms/layout/AppLayout.jsx';

// Super Admin pages
import SuperAdminDashboard from '../features/lms/pages/super-admin/SuperAdminDashboard.jsx';
import SuperAdminProfile from '../features/lms/pages/super-admin/SuperAdminProfile.jsx';
import SuperAdminNotifications from '../features/lms/pages/super-admin/SuperAdminNotifications.jsx';

import DepartmentList from '../features/lms/pages/super-admin/DepartmentList.jsx';
import CreateDepartment from '../features/lms/pages/super-admin/CreateDepartment.jsx';
import DepartmentDetails from '../features/lms/pages/super-admin/DepartmentDetails.jsx';

import HodList from '../features/lms/pages/super-admin/HodList.jsx';
import CreateHod from '../features/lms/pages/super-admin/CreateHod.jsx';
import HodDetails from '../features/lms/pages/super-admin/HodDetails.jsx';

// HOD pages
import HodDashboard from '../features/lms/pages/hod/HodDashboard.jsx';

export const applicationRoutes = [
  // Super Admin
  {
    id: 'super-admin',
    path: '/super-admin',
    roles: ['SUPER_ADMIN'],
    element: <AppLayout />,
    children: [
      {
        id: 'super-admin-dashboard',
        path: 'dashboard',
        element: <SuperAdminDashboard />,
      },
      {
        id: 'super-admin-profile',
        path: 'profile',
        element: <SuperAdminProfile />,
      },
      {
        id: 'super-admin-notifications',
        path: 'notifications',
        element: <SuperAdminNotifications />,
      },
      {
        id: 'super-admin-departments',
        path: 'departments',
        element: <DepartmentList />,
      },
      {
        id: 'super-admin-department-create',
        path: 'departments/new',
        element: <CreateDepartment />,
      },
      {
        id: 'super-admin-department-details',
        path: 'departments/details',
        element: <DepartmentDetails />,
      },
      {
        id: 'super-admin-hods',
        path: 'hods',
        element: <HodList />,
      },
      {
        id: 'super-admin-hod-create',
        path: 'hods/new',
        element: <CreateHod />,
      },
      {
        id: 'super-admin-hod-details',
        path: 'hods/details',
        element: <HodDetails />,
      },
    ],
  },

  // Head of Department
  {
    id: 'hod',
    path: '/hod',
    roles: ['HOD'],
    element: <AppLayout />,
    children: [
      {
        id: 'hod-dashboard',
        path: 'dashboard',
        element: <HodDashboard />,
      },
    ],
  },
];