import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { useAuth } from '../../context/AuthContext';

/**
 * Enterprise Shell Layout Component
 * Orchestrates multi-tenant portal structural shells, responsive sidebar collapsing, and persistent top navigation.
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-row selection:bg-slate-700 selection:text-white">
      {/* Collapsible Sidebar Shell */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Navigation Bar */}
        <TopNavbar onToggleMobileMenu={handleToggleMobileMenu} />

        {/* Dynamic Portal Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Enterprise System Telemetry Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 px-6 py-3 text-[11px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Gateway: Online</span>
            </span>
            <span>|</span>
            <span>Tenant: {user.tenantId.substring(0, 12)}...</span>
          </div>
          <div>
            <span>Enterprise Multi-Tenant AI Platform | RAG Architecture v1.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
