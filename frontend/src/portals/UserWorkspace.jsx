import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { SearchIcon, WorkspaceIcon } from '../components/common/Icons';

/**
 * User Workspace Portal Component
 * Structural shell for multi-modal RAG research queries, document ingestion inspection,
 * visual citations, and split-view document analysis.
 *
 * @component
 * @returns {JSX.Element}
 */
export function UserWorkspace() {
  const { user } = useAuth();
  const [activeQuery, setActiveQuery] = useState('');
  const [retrievalMode, setRetrievalMode] = useState('hybrid');

  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <WorkspaceIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">
                AI Research Assistant Workspace
              </h1>
              <p className="text-sm text-slate-400">
                Corrective RAG synthesis powered by hybrid vector and keyword retrieval.
              </p>
            </div>
          </div>
        </div>

        {/* Model & Engine Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="text-slate-500 mr-1.5">Inference:</span>
            <span className="text-emerald-400 font-medium">DeepSeek-R1 (Local)</span>
          </div>
          <div className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="text-slate-500 mr-1.5">Search Engine:</span>
            <span className="text-sky-400 font-medium">ChromaDB + BM25 (RRF)</span>
          </div>
        </div>
      </div>

      {/* Primary Workspace Grid: Split-View Interaction Shell */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Research Query & Interaction Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Query Formulation Card */}
          <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="rag-query" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Formulate Research Inquiry
              </label>
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-slate-500">Mode:</span>
                <button
                  type="button"
                  onClick={() => setRetrievalMode('hybrid')}
                  className={`px-2 py-0.5 rounded text-xs font-mono border ${
                    retrievalMode === 'hybrid'
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Hybrid RRF
                </button>
                <button
                  type="button"
                  onClick={() => setRetrievalMode('dense')}
                  className={`px-2 py-0.5 rounded text-xs font-mono border ${
                    retrievalMode === 'dense'
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Dense Vector
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                id="rag-query"
                rows={3}
                value={activeQuery}
                onChange={(e) => setActiveQuery(e.target.value)}
                placeholder="Submit inquiry against ingested tenant corpus (e.g., Explain the fault-tolerance guarantees in the distributed consensus module)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-sans"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 font-mono">
                Logical Isolation: {user.tenantIdentifier}
              </span>
              <button
                type="button"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide transition-colors shadow-sm"
              >
                <SearchIcon className="w-3.5 h-3.5" />
                <span>Execute Grounded Query</span>
              </button>
            </div>
          </div>

          {/* Research Response Placeholder */}
          <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Synthesized Analysis Output
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                CRAG Grounding: Verified (0.94)
              </span>
            </div>

            <div className="text-sm text-slate-300 leading-relaxed space-y-3">
              <p>
                The Corrective Retrieval-Augmented Generation framework evaluated 12 candidate chunks across the tenant repository. 
                Exact keyword matches verified via Rank-BM25 aligned with high-density semantic clusters retrieved from ChromaDB.
              </p>
              <div className="p-3 rounded bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
                <div>[Citation 1] ARCHITECTURE.md, Section 2.3: Hybrid Search Reciprocal Rank Fusion</div>
                <div>[Citation 2] System Whitepaper 2026, Section 4.1: Multi-Tenant Logical Boundaries</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Context Inspector & Corpus Ingestion (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Tenant Corpus Collections */}
          <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Indexed Tenant Collections
              </h2>
              <span className="text-[10px] font-mono text-slate-500">3 Collections Active</span>
            </div>

            <div className="space-y-2">
              {[
                { name: 'Core System Architectural Specifications', chunks: 248, status: 'Synced' },
                { name: 'Enterprise Regulatory Compliance Manual', chunks: 1120, status: 'Synced' },
                { name: 'Technical Whitepapers & Research RFCs', chunks: 580, status: 'Indexing' },
              ].map((collection, index) => (
                <div
                  key={index}
                  className="p-3 rounded border border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-slate-200 truncate">{collection.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {collection.chunks} embedded segments
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      collection.status === 'Synced'
                        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/60'
                        : 'text-amber-400 bg-amber-950/40 border-amber-900/60'
                    }`}
                  >
                    {collection.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Retrieval Grounding Inspector */}
          <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Citation Verification Parameters
            </h2>
            <div className="space-y-2 text-xs font-mono text-slate-400">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span>BM25 Weight (k1=1.5, b=0.75):</span>
                <span className="text-slate-200">0.50</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span>Dense Embedding Similarity:</span>
                <span className="text-slate-200">Cosine Metric</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span>LangGraph Evaluator Threshold:</span>
                <span className="text-slate-200">0.82 Score Floor</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
