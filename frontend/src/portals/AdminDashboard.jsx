import React from 'react';
import { AdminIcon } from '../components/common/Icons';

/**
 * Admin Management Portal Component
 * Structural shell for multi-tenant administration, user role assignments,
 * global rate-limiting policies, and microservice infrastructure health.
 *
 * @component
 * @returns {JSX.Element}
 */
export function AdminDashboard() {
  const tenants = [
    {
      id: 'ten_94a73f82',
      name: 'SKIT AI Research Division',
      slug: 'skit-ai-labs',
      usersCount: 68,
      status: 'Active',
      plan: 'Enterprise Dedicated',
    },
    {
      id: 'ten_c31f4e09',
      name: 'Apex BioTech Informatics',
      slug: 'apex-bio',
      usersCount: 142,
      status: 'Active',
      plan: 'Enterprise Dedicated',
    },
    {
      id: 'ten_f8012ba4',
      name: 'Global Legal Analytics LLP',
      slug: 'global-legal',
      usersCount: 35,
      status: 'Active',
      plan: 'Standard Isolation',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AdminIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Tenant & RBAC Administration
            </h1>
            <p className="text-sm text-slate-400">
              Provision organizational boundaries, configure RBAC policies, and oversee platform security.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800/80 text-amber-400 font-medium">
            Authorization Level: Admin
          </span>
        </div>
      </div>

      {/* Infrastructure & Tenant Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Provisioned Tenants', value: '14', detail: '100% Isolated Catalogs' },
          { label: 'Registered Principals', value: '438', detail: 'Identity JWT Enforced' },
          { label: 'CRAG Acceptance Rate', value: '98.4%', detail: 'Hallucination Mitigation' },
          { label: 'Broker Ingestion Queue', value: '3 Tasks', detail: 'RabbitMQ Event Stream' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 shadow-sm"
          >
            <div className="text-[11px] uppercase font-mono tracking-wider text-slate-400">
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-slate-100 tracking-tight mt-1">
              {stat.value}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">{stat.detail}</div>
          </div>
        ))}
      </div>

      {/* Multi-Tenant Directory Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Active Tenant Organizations
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Logical database query filter boundaries enforced via Entity Framework Core.
            </p>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            Provision Tenant
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-5 py-3 font-semibold">Tenant Identifier</th>
                <th className="px-5 py-3 font-semibold">Organization Name</th>
                <th className="px-5 py-3 font-semibold">Slug Identifier</th>
                <th className="px-5 py-3 font-semibold">Active Users</th>
                <th className="px-5 py-3 font-semibold">Isolation Profile</th>
                <th className="px-5 py-3 font-semibold text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {tenants.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-slate-400">{item.id}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-100">{item.name}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-400">{item.slug}</td>
                  <td className="px-5 py-3.5">{item.usersCount} Principals</td>
                  <td className="px-5 py-3.5 text-slate-400">{item.plan}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono border text-emerald-400 bg-emerald-950/40 border-emerald-900/60">
                      {item.status}
                    </span>
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
