import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { UserWorkspace } from './portals/UserWorkspace';
import { AdminDashboard } from './portals/AdminDashboard';
import { AuditPortal } from './portals/AuditPortal';
import { Unauthorized } from './portals/Unauthorized';
import { NotFound } from './portals/NotFound';

/**
 * Root Application Component
 * Initializes the global routing tree, multi-tenant authentication provider,
 * and role-restricted portal navigation boundaries.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Main Layout Wrapping Operational Portals */}
          <Route path="/" element={<Layout />}>
            {/* Default Route Redirect */}
            <Route index element={<Navigate to="/workspace" replace />} />

            {/* User Workspace (Accessible to Admin, Researcher, Viewer) */}
            <Route
              path="workspace"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Researcher', 'Viewer']}>
                  <UserWorkspace />
                </ProtectedRoute>
              }
            />

            {/* Admin Management Dashboard (Restricted to Admin) */}
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Compliance & Audit Portal (Restricted to Admin) */}
            <Route
              path="audit"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AuditPortal />
                </ProtectedRoute>
              }
            />

            {/* Policy Denial Fallback Route */}
            <Route path="unauthorized" element={<Unauthorized />} />

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
