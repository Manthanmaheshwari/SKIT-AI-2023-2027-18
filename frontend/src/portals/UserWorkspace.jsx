import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PDFViewer } from '../components/workspace/PDFViewer';
import { WorkspaceIcon, SendIcon, HighlighterIcon } from '../components/common/Icons';

/**
 * User Workspace Portal Component
 * Features a rigid, responsive 50/50 split-screen workstation architecture:
 * - Left Pane: PDF.js high-DPI canvas viewer with smooth multi-page scrolling, navigation controls, and search bounding boxes.
 * - Right Pane: Structured placeholder for the future enterprise AI research chat interface with citation cross-referencing.
 *
 * @component
 * @returns {JSX.Element}
 */
export function UserWorkspace() {
  const { user } = useAuth();
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [modelTemperature, setModelTemperature] = useState('0.3');
  const [systemStatus, setSystemStatus] = useState(null);

  React.useEffect(() => {
    fetch('/api/gateway-status')
      .then(res => res.json())
      .then(data => setSystemStatus(data))
      .catch(err => setSystemStatus({ backend: 'Offline', ml: 'Offline' }));
  }, []);

  /**
   * Handles citation inspection triggered from the PDF canvas viewer bounding boxes.
   *
   * @param {Object} citation - Bounding box metadata selected in the PDF viewer.
   */
  const handleSelectCitation = (citation) => {
    setSelectedCitation(citation);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[640px] space-y-3">
      {/* Top Telemetry & Session Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <WorkspaceIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none">
              Research Workspace: Split-View Document Analysis
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-modal document grounding paired with asynchronous CRAG reasoning.
            </p>
          </div>
        </div>

        {/* System & Model Telemetry */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          {systemStatus && (
            <span className="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              API: <span className={systemStatus.backend.includes('Online') ? 'text-emerald-400' : 'text-red-400'}>{systemStatus.backend}</span> | ML: <span className={systemStatus.ml.includes('Online') ? 'text-emerald-400' : 'text-red-400'}>{systemStatus.ml}</span>
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Model: <span className="text-emerald-400 font-semibold">DeepSeek-R1</span>
          </span>
          <span className="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hidden sm:inline-block">
            CRAG: <span className="text-sky-400 font-semibold">Active (0.94)</span>
          </span>
        </div>
      </div>

      {/* Rigid 50/50 Split-Screen Workstation Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
        {/* Left Pane (50%): PDF.js Canvas Viewer with Multi-Page Scrolling & Search Overlays */}
        <section
          aria-label="Document Grounding Canvas Viewer"
          className="h-full min-h-0 flex flex-col overflow-hidden"
        >
          <PDFViewer onSelectCitation={handleSelectCitation} />
        </section>

        {/* Right Pane (50%): AI Research Chat Interface Shell */}
        <section
          aria-label="AI Research Assistant Dialogue"
          className="h-full min-h-0 flex flex-col rounded-lg border border-slate-800 bg-slate-900 overflow-hidden shadow-sm"
        >
          {/* Chat Interface Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-slate-200">
                Enterprise AI Dialogue Session
              </span>
              <span className="font-mono text-slate-500 text-[11px]">
                ({user.tenantIdentifier})
              </span>
            </div>

            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
              <span>Temp:</span>
              <select
                value={modelTemperature}
                onChange={(e) => setModelTemperature(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200 focus:outline-none"
              >
                <option value="0.1">0.1 (Strict)</option>
                <option value="0.3">0.3 (Balanced)</option>
                <option value="0.7">0.7 (Creative)</option>
              </select>
            </div>
          </div>

          {/* Active Citation Notification Banner */}
          {selectedCitation && (
            <div className="px-3.5 py-2 bg-amber-950/40 border-b border-amber-900/60 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-amber-300 font-mono text-[11px]">
                <HighlighterIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-semibold">{selectedCitation.label}:</span>
                <span className="truncate max-w-[280px] text-amber-200">
                  {selectedCitation.snippet}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCitation(null)}
                className="text-amber-400 hover:text-amber-200 text-xs font-mono ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Chat Conversation Thread (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* System Boundary Notification */}
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Session encrypted. Data isolated to tenant GUID: {user.tenantId.substring(0, 16)}...</span>
              <span className="text-emerald-500 font-semibold">Ready</span>
            </div>

            {/* Sample User Inquiry */}
            <div className="flex flex-col items-end space-y-1">
              <div className="text-[10px] font-mono text-slate-500">
                Principal: {user.name} | 14:32:05 UTC
              </div>
              <div className="max-w-[85%] rounded-lg p-3 bg-indigo-600/90 text-white leading-relaxed shadow-sm">
                How does the platform prevent hallucinated answers when researching distributed consensus and CRAG architectures?
              </div>
            </div>

            {/* Assistant Reasoning Chain (DeepSeek-R1 Chain of Thought) */}
            <div className="rounded border border-slate-800 bg-slate-950/80 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/80 pb-1.5">
                <span className="text-sky-400 font-medium">Chain of Thought Reasoning Stream</span>
                <span>LangGraph Evaluator: 0.94 Confidence</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 leading-normal">
                1. Retrieved 12 candidate segments via Reciprocal Rank Fusion (BM25 + ChromaDB).
                <br />
                2. State machine evaluated context sufficiency: score 0.94 satisfies the 0.82 threshold.
                <br />
                3. Bounding boxes anchored to Page 1, Section 1.1 of the uploaded architecture whitepaper.
              </p>
            </div>

            {/* Assistant Answer with Visual Grounding Citations */}
            <div className="flex flex-col items-start space-y-1">
              <div className="text-[10px] font-mono text-slate-500">
                DeepSeek-R1 Inference Engine | 14:32:08 UTC
              </div>
              <div className="max-w-[95%] rounded-lg p-3.5 bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed space-y-2.5 shadow-sm">
                <p>
                  The platform utilizes a multi-layer verification strategy. Retrieval combines dense vector search with sparse keyword indexing via Reciprocal Rank Fusion (RRF).
                </p>
                <p>
                  Before synthesis is returned, the LangGraph evaluator checks retrieved tokens for grounding integrity against the verified document bounding boxes shown in the left canvas viewer.
                </p>
                <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-indigo-300">
                    [Citation 1: CRAG Logic, Page 1]
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-sky-300">
                    [Citation 2: Hybrid RRF, Page 1]
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Prompt Composition Shell */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2">
            <div className="relative">
              <textarea
                rows={2}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask inquiry against the currently rendered PDF document..."
                className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500">
                <span>Context: 2,410 / 8,192 Tokens</span>
                <span>|</span>
                <span>Grounding: Strict</span>
              </div>

              <button
                type="button"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
              >
                <SendIcon className="w-3.5 h-3.5" />
                <span>Send Query</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
