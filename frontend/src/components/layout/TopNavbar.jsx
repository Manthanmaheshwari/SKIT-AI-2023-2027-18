import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { MenuIcon, TenantIcon, SunIcon, MoonIcon, ActivityIcon } from '../common/Icons';

/**
 * Top Navigation Bar Component
 * Displays system status, active tenant metadata, breadcrumb hierarchy, role switching controls,
 * and the enterprise dark/light theme toggle.
 *
 * @component
 * @param {Object} props
 * @param {() => void} props.onToggleMobileMenu - Handler to trigger mobile drawer visibility.
 * @returns {JSX.Element}
 */
export function TopNavbar({ onToggleMobileMenu }) {
  const { user, switchRole } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
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
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-200">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 md:hidden transition-colors"
          aria-label="Toggle Navigation Sidebar"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-sm">
          <span className="text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">Platform</span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold tracking-tight">
            {getBreadcrumbTitle(location.pathname)}
          </span>
        </div>

        {/* Live Cluster Health Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 ml-4 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Gateway: 99.98% SLA</span>
        </div>
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3.5">
        {/* =========================================================================
            Enterprise Theme Toggle Button (Light / Dark)
            ========================================================================= */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors cursor-pointer shadow-2xs"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          aria-label={`Toggle theme (currently ${theme})`}
        >
          {isDark ? (
            <>
              <SunIcon className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium hidden md:inline">Light</span>
            </>
          ) : (
            <>
              <MoonIcon className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium hidden md:inline">Dark</span>
            </>
          )}
        </button>

        {/* Tenant Boundary Indicator */}
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs">
          <TenantIcon className="w-3.5 h-3.5 text-blue-600 dark:text-slate-400" />
          <span className="text-slate-500 dark:text-slate-400 font-medium">Tenant:</span>
          <span className="text-slate-900 dark:text-slate-200 font-mono tracking-tight font-semibold">
            {user.tenantIdentifier}
          </span>
        </div>

        {/* Role Switching Control (RBAC Simulation) */}
        <div className="flex items-center space-x-1.5 text-xs bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1">
          <label htmlFor="role-select" className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
            Role:
          </label>
          <select
            id="role-select"
            value={user.role}
            onChange={(e) => switchRole(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="Admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              Admin
            </option>
            <option value="Researcher" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              Researcher
            </option>
            <option value="Viewer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              Viewer
            </option>
          </select>
        </div>

        {/* User Identity Profile Indicator */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full border border-blue-200 dark:border-slate-700 bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-slate-200 shadow-2xs">
            {user.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">{user.name}</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">{user.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
