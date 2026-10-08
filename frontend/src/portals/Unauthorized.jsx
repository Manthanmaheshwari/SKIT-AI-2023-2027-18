import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlertIcon } from '../components/common/Icons';

/**
 * Unauthorized / Access Denied Portal Component
 * Rendered when authenticated identity fails RBAC policy evaluation for restricted routes.
 *
 * @component
 * @returns {JSX.Element}
 */
export function Unauthorized() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, switchRole } = useAuth();

  const state = location.state || {};
  const attemptedPath = state.attemptedPath || 'Restricted Endpoint';
  const requiredRoles = state.requiredRoles || ['Admin'];

  const handleElevateRole = () => {
    switchRole('Admin');
    if (state.attemptedPath) {
      navigate(state.attemptedPath);
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-lg border border-rose-950/80 bg-slate-900/90 p-6 sm:p-8 space-y-5 text-center shadow-lg">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <ShieldAlertIcon className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-bold text-slate-100 tracking-tight">
            Role-Based Access Policy Denied
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your current assigned role does not hold sufficient authorization privileges to access this operational portal.
          </p>
        </div>

        {/* Security Boundary Diagnostics */}
        <div className="p-3.5 rounded bg-slate-950 border border-slate-800 text-left text-xs font-mono space-y-1.5 text-slate-400">
          <div className="flex justify-between">
            <span className="text-slate-500">Attempted Route:</span>
            <span className="text-slate-200">{attemptedPath}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Session Role:</span>
            <span className="text-amber-400">{user.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Authorized Roles:</span>
            <span className="text-emerald-400">{requiredRoles.join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tenant Boundary:</span>
            <span className="text-slate-300">{user.tenantIdentifier}</span>
          </div>
        </div>

        {/* Remediation & Navigation Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/workspace')}
            className="w-full sm:w-auto px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            Return to Workspace
          </button>
          <button
            type="button"
            onClick={handleElevateRole}
            className="w-full sm:w-auto px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
          >
            Assume Admin Role
          </button>
        </div>
      </div>
    </div>
  );
}
