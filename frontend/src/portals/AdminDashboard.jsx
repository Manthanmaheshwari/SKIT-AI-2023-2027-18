import React, { useState } from 'react';
import {
  AdminIcon,
  ServerIcon,
  DatabaseIcon,
  ActivityIcon,
  SearchIcon,
  RefreshIcon,
  FilterIcon,
  ShieldCheckIcon,
} from '../components/common/Icons';

/**
 * Admin Management Portal Component
 * Executive dashboard for multi-tenant administration, user role assignments,
 * global rate-limiting policies, and microservice infrastructure health.
 *
 * @component
 * @returns {JSX.Element}
 */
export function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tenants = [
    {
      id: 'ten_94a73f82',
      name: 'SKIT AI Research Division',
      slug: 'skit-ai-labs',
      usersCount: 68,
      status: 'Active',
      plan: 'Enterprise Dedicated',
      storageUsed: 78,
      vectorCount: '4,280 chunks',
      lastIngest: '12 mins ago',
    },
    {
      id: 'ten_c31f4e09',
      name: 'Apex BioTech Informatics',
      slug: 'apex-bio',
      usersCount: 142,
      status: 'Active',
      plan: 'Enterprise Dedicated',
      storageUsed: 64,
      vectorCount: '6,190 chunks',
      lastIngest: '1 hour ago',
    },
    {
      id: 'ten_f8012ba4',
      name: 'Global Legal Analytics LLP',
      slug: 'global-legal',
      usersCount: 35,
      status: 'Active',
      plan: 'Standard Isolation',
      storageUsed: 32,
      vectorCount: '1,840 chunks',
      lastIngest: 'Yesterday',
    },
    {
      id: 'ten_e109d73c',
      name: 'Quantum BioPharma Labs',
      slug: 'quantum-bio',
      usersCount: 89,
      status: 'Active',
      plan: 'Enterprise Dedicated',
      storageUsed: 89,
      vectorCount: '7,410 chunks',
      lastIngest: '3 hours ago',
    },
    {
      id: 'ten_b4510a19',
      name: 'Meridian Geospatial Institute',
      slug: 'meridian-geo',
      usersCount: 52,
      status: 'Active',
      plan: 'Standard Isolation',
      storageUsed: 45,
      vectorCount: '2,920 chunks',
      lastIngest: '4 days ago',
    },
  ];

  const clusterNodes = [
    {
      name: '.NET 8 Enterprise Gateway',
      type: 'Core Gateway & Identity',
      endpoint: 'http://localhost:5000',
      status: 'Healthy',
      latency: '18ms',
      uptime: '99.99%',
      role: 'Rate Limiter & JWT Issuer',
    },
    {
      name: 'FastAPI AI Microservice',
      type: 'Python 3.12 Inference',
      endpoint: 'http://localhost:8000',
      status: 'Healthy',
      latency: '42ms',
      uptime: '99.95%',
      role: 'Hybrid Retrieval & RRF',
    },
    {
      name: 'ChromaDB Vector Store',
      type: 'Persistent Vector Store',
      endpoint: './chroma_db',
      status: 'Online',
      latency: '6ms',
      uptime: '100%',
      role: 'Multi-Tenant Partitioned',
    },
    {
      name: 'MS SQL Server LocalDB',
      type: 'Relational Store',
      endpoint: '(localdb)\\mssqllocaldb',
      status: 'Running',
      latency: '4ms',
      uptime: '100%',
      role: 'EF Core Global Query Filters',
    },
    {
      name: 'RabbitMQ Message Broker',
      type: 'Async Event Bus',
      endpoint: 'localhost:5672',
      status: 'Operational',
      latency: '2ms',
      uptime: '99.98%',
      role: 'document.ingestion.queue',
    },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedTab === 'ALL') return matchesSearch;
    if (selectedTab === 'DEDICATED') return matchesSearch && t.plan.includes('Dedicated');
    if (selectedTab === 'STANDARD') return matchesSearch && t.plan.includes('Standard');
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* =========================================================================
          Executive Header
          ========================================================================= */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 shadow-2xs">
            <AdminIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Tenant & RBAC Administration
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Provision organizational boundaries, configure RBAC policies, and observe cluster indexing workloads.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Sync Telemetry</span>
          </button>

          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs">
            Admin Tier
          </span>
        </div>
      </div>

      {/* =========================================================================
          Top KPI Stat Cards (4 Grid)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Provisioned Tenants',
            value: '14',
            trend: '+2 this month',
            trendPositive: true,
            detail: '100% Isolated Catalogs',
            icon: DatabaseIcon,
          },
          {
            label: 'Registered Principals',
            value: '438',
            trend: '+34 active today',
            trendPositive: true,
            detail: 'Identity JWT Enforced',
            icon: ShieldCheckIcon,
          },
          {
            label: 'CRAG Precision Rate',
            value: '98.4%',
            trend: '+1.8% vs benchmark',
            trendPositive: true,
            detail: 'Hallucination Mitigation',
            icon: ActivityIcon,
          },
          {
            label: 'Ingestion Event Queue',
            value: '3 Tasks',
            trend: '0 Dead Letter Queue',
            trendPositive: true,
            detail: 'RabbitMQ Event Stream',
            icon: ServerIcon,
          },
        ].map((stat, idx) => {
          const IconComp = stat.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs transition-all hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 font-medium">
                  {stat.label}
                </span>
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <IconComp className="w-4 h-4" />
                </div>
              </div>

              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-2">
                {stat.value}
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {stat.trend}
                </span>
                <span className="text-slate-400 font-mono">{stat.detail}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          Microservice Cluster Topology Status
          ========================================================================= */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <ServerIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Microservice Cluster Topology & Node Health</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live heartbeat telemetry across all distributed application and persistence tiers.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>All 5 Nodes Operational</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          {clusterNodes.map((node, index) => (
            <div key={index} className="p-4 flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {node.name}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
                    {node.status}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {node.endpoint}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {node.role}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">Latency: <strong className="text-slate-700 dark:text-slate-300">{node.latency}</strong></span>
                <span className="text-slate-500">SLA: <strong className="text-slate-700 dark:text-slate-300">{node.uptime}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          Multi-Tenant Directory Table with Filters & Search
          ========================================================================= */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTab === 'ALL'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All Tenants ({tenants.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('DEDICATED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTab === 'DEDICATED'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Dedicated Catalogs (3)
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('STANDARD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTab === 'STANDARD'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Standard Isolation (2)
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tenant or slug..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Organization & Identifier</th>
                <th className="px-5 py-3.5">Isolation Tier</th>
                <th className="px-5 py-3.5">Users</th>
                <th className="px-5 py-3.5">Storage Quota</th>
                <th className="px-5 py-3.5">Vector Pool</th>
                <th className="px-5 py-3.5">Last Ingest</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-sans">
              {filteredTenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {tenant.name}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                      {tenant.slug} • <span className="text-slate-500">{tenant.id}</span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                        tenant.plan.includes('Dedicated')
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900'
                          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {tenant.plan}
                    </span>
                  </td>

                  <td className="px-5 py-4 font-mono font-medium">
                    {tenant.usersCount} Principals
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            tenant.storageUsed > 80
                              ? 'bg-amber-500'
                              : 'bg-blue-600 dark:bg-blue-500'
                          }`}
                          style={{ width: `${tenant.storageUsed}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {tenant.storageUsed}%
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-400">
                    {tenant.vectorCount}
                  </td>

                  <td className="px-5 py-4 text-slate-500 text-[11px]">
                    {tenant.lastIngest}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
