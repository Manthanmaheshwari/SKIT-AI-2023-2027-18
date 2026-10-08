import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Route Guard Component for Role-Based Access Control (RBAC).
 * Enforces authentication and authorization policies across enterprise portal routes.
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Target view component to render if access is granted.
 * @param {string[]} [props.allowedRoles] - Optional list of authorized role names.
 * @returns {JSX.Element}
 */
export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          attemptedPath: location.pathname,
          requiredRoles: allowedRoles,
          currentRole: user.role,
        }}
        replace
      />
    );
  }

  return children;
}
