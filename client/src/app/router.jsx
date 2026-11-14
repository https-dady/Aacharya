import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import useAuth from '../features/auth/context/useAuth.js';

import {
  isSupportedRole,
} from '../features/lms/config/role-navigation.js';

import StudentActivation from '../features/auth/pages/StudentActivation.jsx';

const ROLE_DASHBOARD_PATHS = Object.freeze({
  SUPER_ADMIN: '/super-admin/dashboard',
  HOD: '/hod/dashboard',
  FACULTY: '/faculty/dashboard',
  MENTOR: '/mentor/dashboard',
  STUDENT: '/student/dashboard',
  ALUMNI: '/alumni/dashboard',
});

function normalizeRole(role) {
  return typeof role === 'string'
    ? role.trim().toUpperCase()
    : '';
}

function getPrimaryDashboardPath(role) {
  return ROLE_DASHBOARD_PATHS[normalizeRole(role)] || '/';
}

function SessionRestorationView() {
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

/**
 * Protects a route subtree using the authenticated user's effective roles.
 *
 * Mentor and HOD accounts receive the shared FACULTY capability through
 * AuthContext normalization, while their primary role remains unchanged.
 *
 * Backend authorization remains authoritative.
 */
function RoleGuard({ roles, children }) {
  const {
    user,
    loading,
    hasRole,
  } = useAuth();

  if (loading) {
    return <SessionRestorationView />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const primaryRole = normalizeRole(user.role);

  if (!isSupportedRole(primaryRole)) {
    return <Navigate to="/" replace />;
  }

  if (user.isEmailVerified === false) {
    return <Navigate to="/" replace />;
  }

  const requiredRoles = Array.isArray(roles)
    ? roles.map(normalizeRole).filter(Boolean)
    : [];

  if (
    requiredRoles.length > 0
    && !hasRole(...requiredRoles)
  ) {
    return (
      <Navigate
        to={getPrimaryDashboardPath(primaryRole)}
        replace
      />
    );
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

  const protectedElement = Array.isArray(roles) && roles.length > 0
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
      {Array.isArray(children)
        && children.map(renderRoute)}
    </Route>
  );
}

export default function AppRouter({
  children,
  routes = [],
}) {
  return (
    <Routes>
      <Route
        path="/activate-account"
        element={<StudentActivation />}
      />

      {routes.map(renderRoute)}

      <Route
        path="*"
        element={children}
      />
    </Routes>
  );
}