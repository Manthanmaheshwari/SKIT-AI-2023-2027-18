import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MenuIcon, TenantIcon } from '../common/Icons';

/**
 * Top Navigation Bar Component
 * Displays system status, active tenant metadata, breadcrumb hierarchy, and role switching controls.
 *
 * @component
 * @param {Object} props
 * @param {() => void} props.onToggleMobileMenu - Handler to trigger mobile drawer visibility.
 * @returns {JSX.Element}
 */
export function TopNavbar({ onToggleMobileMenu }) {
  const { user, switchRole } = useAuth();
  const location = useLocation();

  /**
   * Derives human-readable breadcrumb label from route path.
   *
   * @param {string} pathname
   * @returns {string}
   */
  const getBreadcrumbTitle = (pathname) => {
    if (pathname.startsWith('/admin')) {
      return 'Admin Management Portal';
    }
    if (pathname.startsWith('/audit')) {
      return 'Compliance & Audit Portal';
    }
    if (pathname.startsWith('/workspace')) {
      return 'AI Research Workspace';
    }
    if (pathname.startsWith('/unauthorized')) {
      return 'Security Policy Restriction';
    }
    return 'Enterprise Portal';
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-700 md:hidden"
          aria-label="Toggle Navigation Sidebar"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-sm">
          <span className="text-slate-500 font-medium hidden sm:inline">Platform</span>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <span className="text-slate-200 font-semibold tracking-wide">
            {getBreadcrumbTitle(location.pathname)}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Tenant Boundary Indicator */}
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded border border-slate-800 bg-slate-950/60 text-xs">
          <TenantIcon className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">Tenant:</span>
          <span className="text-slate-200 font-mono tracking-tight">{user.tenantIdentifier}</span>
        </div>

        {/* Role Switching Control (RBAC Simulation) */}
        <div className="flex items-center space-x-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded px-2 py-1">
          <label htmlFor="role-select" className="text-slate-400 font-medium hidden sm:inline">
            Role:
          </label>
          <select
            id="role-select"
            value={user.role}
            onChange={(e) => switchRole(e.target.value)}
            className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="Admin" className="bg-slate-900 text-slate-200">
              Admin
            </option>
            <option value="Researcher" className="bg-slate-900 text-slate-200">
              Researcher
            </option>
            <option value="Viewer" className="bg-slate-900 text-slate-200">
              Viewer
            </option>
          </select>
        </div>

        {/* User Identity Profile Indicator */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded border border-slate-700 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-200">
            {user.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-medium text-slate-200 leading-none">{user.name}</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">{user.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
