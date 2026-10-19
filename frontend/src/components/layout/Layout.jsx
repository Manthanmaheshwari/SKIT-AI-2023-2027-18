import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { useAuth } from '../../context/AuthContext';

/**
 * Enterprise Shell Layout Component
 * Orchestrates multi-tenant portal structural shells, responsive sidebar collapsing,
 * persistent top navigation, and adaptive light/dark theme styling.
 *
 * @component
 * @returns {JSX.Element}
 */
export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  const handleToggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

  const handleToggleMobileMenu = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleCloseMobile = () => {
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-row selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/50 dark:selection:text-blue-200 transition-colors duration-150">
      {/* Collapsible Sidebar Shell */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Navigation Bar with Theme Toggle */}
        <TopNavbar onToggleMobileMenu={handleToggleMobileMenu} />

        {/* Dynamic Portal Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Enterprise System Telemetry Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 px-6 py-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 transition-colors duration-200">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="font-medium text-slate-700 dark:text-slate-300">Gateway: Online</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>Tenant: {user.tenantId.substring(0, 12)}...</span>
            <span className="text-slate-300 dark:text-slate-700 hidden md:inline">|</span>
            <span className="hidden md:inline">Latency: ~24ms</span>
          </div>
          <div>
            <span>Enterprise Multi-Tenant AI Platform | RAG Architecture v2.0-PROD</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
