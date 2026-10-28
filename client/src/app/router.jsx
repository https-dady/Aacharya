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

  if (user.isEmailVerified === false) {
    return <Navigate to="/" replace />;
  }

  if (
    Array.isArray(roles)
    && roles.length > 0
    && !roles.some(
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
      {/* Public route: student activates their account via email link. */}
      <Route
        path="/activate-account"
        element={<StudentActivation />}
      />

      {/* Preserve all existing application routes and role guards. */}
      {routes.map(renderRoute)}

      {/* Preserve the existing authentication fallback. */}
      <Route
        path="*"
        element={children}
      />
    </Routes>
  );
}