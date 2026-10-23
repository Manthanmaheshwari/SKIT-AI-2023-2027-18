import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  WorkspaceIcon,
  AdminIcon,
  AuditIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlatformLogo,
  LockIcon,
  CloseIcon,
} from '../common/Icons';

/**
 * Navigation item configuration object.
 * @typedef {Object} NavItem
 * @property {string} name - Display title.
 * @property {string} path - Target router path.
 * @property {React.ComponentType<any>} icon - SVG Icon component.
 * @property {string[]} allowedRoles - Roles permitted to access this portal.
 * @property {string} badge - Descriptive tag or status.
 */

/**
 * Portal navigation routes specification.
 * @type {NavItem[]}
 */
const NAVIGATION_ITEMS = [
  {
    name: 'User Workspace',
    path: '/workspace',
    icon: WorkspaceIcon,
    allowedRoles: ['Admin', 'Researcher', 'Viewer'],
    badge: 'Core',
  },
  {
    name: 'Admin Dashboard',
    path: '/admin',
    icon: AdminIcon,
    allowedRoles: ['Admin'],
    badge: 'Restricted',
  },
  {
    name: 'Audit Portal',
    path: '/audit',
    icon: AuditIcon,
    allowedRoles: ['Admin'],
    badge: 'Compliance',
  },
];

/**
 * Collapsible Enterprise Sidebar Component
 * Manages responsive drawer navigation, collapse states, and visual role access indicators
 * with crisp professional light & dark theme styling.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.collapsed - Whether the sidebar is collapsed to icon-only mode.
 * @param {() => void} props.onToggleCollapse - Toggle handler for collapse state.
 * @param {boolean} props.mobileOpen - Whether the mobile drawer overlay is currently active.
 * @param {() => void} props.onCloseMobile - Handler to close mobile drawer.
 * @returns {JSX.Element}
 */
export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { hasRole, user } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 ease-in-out shadow-xs ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand / Logo Header */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 flex-shrink-0 shadow-2xs">
              <PlatformLogo className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 leading-none">
                  Enterprise
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                  AI Research
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 md:hidden"
            aria-label="Close sidebar navigation"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tenant Summary Banner (Expanded Mode) */}
        {!collapsed && (
          <div className="p-3 m-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">
              Active Organization
            </div>
            <div className="text-slate-800 dark:text-slate-200 font-semibold truncate mt-0.5">
              {user.tenantName}
            </div>
          </div>
        )}

        {/* Navigation Portal Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Operational Portals
            </div>
          )}

          {NAVIGATION_ITEMS.map((item) => {
            const isAuthorized = hasRole(item.allowedRoles);
            const IconComponent = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                title={collapsed ? item.name : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all group relative ${
                    isActive
                      ? 'bg-blue-50/90 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 border border-transparent'
                  } ${!isAuthorized ? 'opacity-70' : ''}`
                }
              >
                <IconComponent
                  className={`flex-shrink-0 w-5 h-5 transition-colors ${
                    collapsed ? 'mx-auto' : 'mr-3'
                  } text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200`}
                />

                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">{item.name}</span>
                    <div className="flex items-center space-x-1.5 ml-2">
                      {!isAuthorized && (
                        <span
                          title={`Requires ${item.allowedRoles.join(', ')} permission`}
                          className="text-amber-500"
                        >
                          <LockIcon className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
                        {item.badge}
                      </span>
                    </div>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System & Active Role Footnote */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-900/80">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500">
                  Current Session
                </span>
                <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                  Role: {user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                aria-label="Expand sidebar"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
