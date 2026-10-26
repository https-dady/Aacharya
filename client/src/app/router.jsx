import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import useAuth from '../features/auth/context/useAuth.js';

import {
  isSupportedRole,
} from '../features/lms/config/role-navigation.js';

function normalizeRole(role) {
  return typeof role === 'string'
    ? role.trim().toUpperCase()
    : '';
}

function RoleGuard({
  roles,
  children,
}) {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div
        className="flex min-h-40 items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <span className="text-sm text-[#A4A4AF]">
          Restoring your session...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const userRole = normalizeRole(user.role);

  if (!isSupportedRole(userRole)) {
    return <Navigate to="/" replace />;
  }

  if (
    Array.isArray(roles) &&
    roles.length > 0 &&
    !roles.some(
      (role) => normalizeRole(role) === userRole,
    )
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function renderRoute(route, index) {
  const {
    path,
    element,
    roles,
    children,
  } = route;

  const protectedElement = roles?.length
    ? (
      <RoleGuard roles={roles}>
        {element}
      </RoleGuard>
    )
    : element;

  return (
    <Route
      key={route.id || path || `route-${index}`}
      path={path}
      element={protectedElement}
    >
      {Array.isArray(children) &&
        children.map(renderRoute)}
    </Route>
  );
}

/**
 * Central application router.
 *
 * Route configuration can be supplied incrementally as
 * role-specific pages are implemented.
 *
 * Route configuration format:
 *
 * {
 *   id: 'super-admin-dashboard',
 *   path: '/super-admin/dashboard',
 *   roles: ['SUPER_ADMIN'],
 *   element: <SuperAdminDashboard />
 * }
 *
 * Nested routes can be supplied through the children property.
 *
 * The existing authentication UI remains available as the
 * fallback until authenticated routes are integrated into App.jsx.
 */
export default function AppRouter({
  children,
  routes = [],
}) {
  return (
    <Routes>
      {routes.map(renderRoute)}

      <Route
        path="*"
        element={children}
      />
    </Routes>
  );
}