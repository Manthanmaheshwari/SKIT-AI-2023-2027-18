import React, { useState } from 'react';
import {
  AuditIcon,
  SearchIcon,
  ShieldCheckIcon,
  ActivityIcon,
  RefreshIcon,
  FilterIcon,
} from '../components/common/Icons';

/**
 * Compliance & Audit Portal Component
 * Enterprise immutable audit logging, forensic verification,
 * document access tracking, and security event telemetry with dual-theme design.
 *
 * @component
 * @returns {JSX.Element}
 */
export function AuditPortal() {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const auditEvents = [
    {
      id: 'evt_91f42',
      hash: 'sha256:7e9a2b8...4f1c',
      timestamp: '2026-09-25T14:32:08Z',
      action: 'RAG_QUERY_EXECUTED',
      principal: 'sarah.chen@acme-research.org',
      tenant: 'skit-ai-labs',
      status: 'VERIFIED',
      ip: '192.168.1.144',
      details: 'Dense vector search with LangGraph evaluator confidence 0.94',
    },
    {
      id: 'evt_91f41',
      hash: 'sha256:3a1b9c2...88df',
      timestamp: '2026-09-25T14:28:11Z',
      action: 'DOC_INGEST_COMPLETED',
      principal: 'system.worker@internal',
      tenant: 'skit-ai-labs',
      status: 'SUCCESS',
      ip: '10.0.4.12',
      details: 'RabbitMQ ingestion parsed 248 chunks into ChromaDB namespace',
    },
    {
      id: 'evt_91f40',
      hash: 'sha256:bc89f01...a512',
      timestamp: '2026-09-25T14:15:44Z',
      action: 'AUTH_TOKEN_ISSUED',
      principal: 'niyukti.janu@skit-research.edu',
      tenant: 'skit-ai-labs',
      status: 'SUCCESS',
      ip: '103.21.124.9',
      details: 'JWT session authenticated via ASP.NET Core Identity with role Admin',
    },
    {
      id: 'evt_91f39',
      hash: 'sha256:99f012a...77e4',
      timestamp: '2026-09-25T13:58:20Z',
      action: 'CROSS_TENANT_BLOCKED',
      principal: 'external.auditor@thirdparty.com',
      tenant: 'apex-bio',
      status: 'REJECTED',
      ip: '198.51.100.45',
      details: 'Cross-tenant boundary breach blocked by EF Core Global Query Filter',
    },
    {
      id: 'evt_91f38',
      hash: 'sha256:44b12c8...ef09',
      timestamp: '2026-09-25T13:42:15Z',
      action: 'VECTOR_INDEX_PURGED',
      principal: 'rounak.admin@skit-research.edu',
      tenant: 'global-legal',
      status: 'WARNING',
      ip: '172.16.2.80',
      details: 'Document retention purge executed under GDPR compliance request',
    },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredEvents = auditEvents.filter((item) => {
    const matchesFilter = filterSeverity === 'ALL' || item.status === filterSeverity;
    const matchesSearch =
      item.principal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* =========================================================================
          Portal Header
          ========================================================================= */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 shadow-2xs">
            <AuditIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Enterprise Compliance & Forensic Audit Portal
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tamper-evident forensic ledger capturing all authentication events, cross-tenant evaluations, and document retrievals.
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
            <span>Verify Ledger</span>
          </button>

          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-semibold shadow-2xs">
            Retention: 365 Days
          </span>
        </div>
      </div>

      {/* =========================================================================
          Audit KPI Cards
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Ledger Entries',
            value: '184,920',
            trend: '+1,240 in last 24h',
            detail: 'SHA-256 Merkle Root Verified',
          },
          {
            label: 'Cross-Tenant Interceptions',
            value: '0 Breaches',
            trend: '100% Query Filter Coverage',
            detail: '1 Blocked Attempt Flagged',
          },
          {
            label: 'Cryptographic Checksum',
            value: 'Valid (256-bit)',
            trend: 'Last verified 2m ago',
            detail: 'Zero Tampering Detected',
          },
          {
            label: 'Active Identity Tokens',
            value: '438 Sessions',
            trend: 'Strict Rotation Enforced',
            detail: 'ASP.NET Core Identity Store',
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
          >
            <div className="text-[11px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 font-medium">
              {kpi.label}
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1.5">
              {kpi.value}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {kpi.trend}
              </span>
              <span className="text-slate-400 font-mono">{kpi.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* =========================================================================
          Filter and Search Toolbar
          ========================================================================= */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search principal, IP, action, or event hash..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium mr-1 text-[11px]">Severity:</span>
          {['ALL', 'VERIFIED', 'SUCCESS', 'REJECTED', 'WARNING'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterSeverity(status)}
              className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
                filterSeverity === status
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          Forensic Audit Table
          ========================================================================= */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Event ID & Checksum</th>
                <th className="px-5 py-3.5">Timestamp (UTC)</th>
                <th className="px-5 py-3.5">Action Type</th>
                <th className="px-5 py-3.5">Principal</th>
                <th className="px-5 py-3.5">Tenant</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">IP Address</th>
                <th className="px-5 py-3.5">Forensic Telemetry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-sans">
              {filteredEvents.map((evt) => (
                <tr
                  key={evt.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-5 py-3.5 font-mono">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{evt.id}</span>
                    <div className="text-[10px] text-slate-400 truncate max-w-[110px]">{evt.hash}</div>
                  </td>

                  <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {evt.timestamp}
                  </td>

                  <td className="px-5 py-3.5 font-mono font-medium text-slate-800 dark:text-slate-200">
                    {evt.action}
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{evt.principal}</div>
                  </td>

                  <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                    {evt.tenant}
                  </td>

                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                        evt.status === 'VERIFIED'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900'
                          : evt.status === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900'
                          : evt.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900'
                      }`}
                    >
                      {evt.status}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px]">
                    {evt.ip}
                  </td>

                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={evt.details}>
                    {evt.details}
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
