import React, { createContext, useContext, useState } from 'react';

/**
 * User Identity & Tenant Context Structure
 * @typedef {Object} TenantUser
 * @property {string} id - Subject identifier (GUID).
 * @property {string} name - Display name.
 * @property {string} email - Organization email address.
 * @property {'Admin' | 'Researcher' | 'Viewer'} role - Assigned application role.
 * @property {string} tenantId - Tenant identifier GUID.
 * @property {string} tenantIdentifier - Human-readable tenant slug.
 * @property {string} tenantName - Tenant organizational entity name.
 */

/**
 * Authentication Context Contract
 * @typedef {Object} AuthContextType
 * @property {TenantUser} user - Currently authenticated tenant principal.
 * @property {boolean} isAuthenticated - Authentication validity indicator.
 * @property {(roles: string[]) => boolean} hasRole - Evaluates if active principal possesses required role.
 * @property {(role: 'Admin' | 'Researcher' | 'Viewer') => void} switchRole - Development stub to switch active session role.
 * @property {(tenant: Partial<TenantUser>) => void} updateTenant - Updates active tenant boundary.
 */

const initialUser = {
  id: 'usr_e92bf170-42c1-4b13-9118-a6217c919d38',
  name: 'Niyukti Singh Janu',
  email: 'niyukti.janu@skit-research.edu',
  role: 'Admin',
  tenantId: 'ten_94a73f82-31ec-46bc-92cb-5e16f5c0981b',
  tenantIdentifier: 'skit-ai-labs',
  tenantName: 'SKIT AI Research Division',
};

const AuthContext = createContext(null);

/**
 * Authentication & RBAC Provider Component
 * Stubs multi-tenant identity verification and role evaluation.
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child component hierarchy.
 * @returns {JSX.Element}
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(initialUser);
  const [isAuthenticated] = useState(true);

  /**
   * Evaluates if the current authenticated user meets role requirements.
   *
   * @param {string[]} allowedRoles - Array of authorized role keys.
   * @returns {boolean} True if authorized, false otherwise.
   */
  const hasRole = (allowedRoles) => {
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }
    return allowedRoles.includes(user.role);
  };

  /**
   * Development stub allowing runtime simulation of role-based authorization.
   *
   * @param {'Admin' | 'Researcher' | 'Viewer'} newRole - Target role to assume.
   */
  const switchRole = (newRole) => {
    setUser((prev) => ({
      ...prev,
      role: newRole,
    }));
  };

  /**
   * Updates current tenant context.
   *
   * @param {Partial<TenantUser>} tenantData - New tenant details.
   */
  const updateTenant = (tenantData) => {
    setUser((prev) => ({
      ...prev,
      ...tenantData,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        hasRole,
        switchRole,
        updateTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to access authentication context.
 *
 * @returns {AuthContextType} Authentication and RBAC helper object.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider hierarchy.');
  }
  return context;
}
