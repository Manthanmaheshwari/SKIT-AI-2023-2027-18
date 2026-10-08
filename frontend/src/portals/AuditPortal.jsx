import React, { useState } from 'react';
import { AuditIcon, SearchIcon } from '../components/common/Icons';

/**
 * Compliance & Audit Portal Component
 * Structural shell for enterprise immutable audit logging, forensic verification,
 * document access tracking, and security event telemetry.
 *
 * @component
 * @returns {JSX.Element}
 */
export function AuditPortal() {
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const auditEvents = [
    {
      id: 'evt_91f42',
      timestamp: '2026-09-25T14:32:08Z',
      action: 'RAG_QUERY_EXECUTED',
      principal: 'sarah.chen@acme-research.org',
      tenant: 'skit-ai-labs',
      status: 'VERIFIED',
      ip: '192.168.1.144',
      details: 'Dense vector search with LangGraph evaluator score 0.94',
    },
    {
      id: 'evt_91f41',
      timestamp: '2026-09-25T14:28:11Z',
      action: 'DOC_INGEST_COMPLETED',
      principal: 'system.worker@internal',
      tenant: 'skit-ai-labs',
      status: 'SUCCESS',
      ip: '10.0.4.12',
      details: 'RabbitMQ queue task parsed 248 chunks into ChromaDB',
    },
    {
      id: 'evt_91f40',
      timestamp: '2026-09-25T14:15:44Z',
      action: 'AUTH_TOKEN_ISSUED',
      principal: 'niyukti.janu@skit-research.edu',
      tenant: 'skit-ai-labs',
      status: 'SUCCESS',
      ip: '103.21.124.9',
      details: 'JWT session authenticated via ASP.NET Core Identity',
    },
    {
      id: 'evt_91f39',
      timestamp: '2026-09-25T13:58:20Z',
      action: 'CROSS_TENANT_BLOCKED',
      principal: 'external.auditor@thirdparty.com',
      tenant: 'apex-bio',
      status: 'REJECTED',
      ip: '198.51.100.45',
      details: 'Unauthorized tenant scope attempt halted by global query filter',
    },
  ];

  const filteredEvents =
    filterSeverity === 'ALL'
      ? auditEvents
      : auditEvents.filter((item) => item.status === filterSeverity);

  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <AuditIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Enterprise Compliance & Audit Portal
            </h1>
            <p className="text-sm text-slate-400">
              Immutable telemetry capturing system events, document access, and tenant isolation integrity.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-sky-950/40 border border-sky-800/80 text-sky-400 font-medium">
            Retention Policy: 365 Days Immutable
          </span>
        </div>
      </div>

      {/* Filter and Query Toolbar */}
      <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search audit trail by principal, IP, or hash..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end text-xs">
          <span className="text-slate-400 font-medium">Status Filter:</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-slate-700"
          >
            <option value="ALL">All Events</option>
            <option value="VERIFIED">Verified</option>
            <option value="SUCCESS">Success</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button
            type="button"
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Audit Event Telemetry Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-5 py-3 font-semibold">Event Identifier</th>
                <th className="px-5 py-3 font-semibold">UTC Timestamp</th>
                <th className="px-5 py-3 font-semibold">Action Type</th>
                <th className="px-5 py-3 font-semibold">Subject Principal</th>
                <th className="px-5 py-3 font-semibold">Tenant Scope</th>
                <th className="px-5 py-3 font-semibold">Client Address</th>
                <th className="px-5 py-3 font-semibold text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-slate-400">{event.id}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-400">{event.timestamp}</td>
                  <td className="px-5 py-3.5 font-mono font-medium text-slate-200">
                    {event.action}
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{event.principal}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-400">{event.tenant}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-500">{event.ip}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        event.status === 'REJECTED'
                          ? 'text-rose-400 bg-rose-950/40 border-rose-900/60'
                          : event.status === 'VERIFIED'
                          ? 'text-sky-400 bg-sky-950/40 border-sky-900/60'
                          : 'text-emerald-400 bg-emerald-950/40 border-emerald-900/60'
                      }`}
                    >
                      {event.status}
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
