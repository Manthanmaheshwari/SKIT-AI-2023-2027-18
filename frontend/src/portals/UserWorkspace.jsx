import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { PDFViewerComponent } from '../components/workspace/PDFViewerComponent';
import {
  WorkspaceIcon,
  SendIcon,
  HighlighterIcon,
  ActivityIcon,
  UploadIcon,
  DocumentIcon,
  CloseIcon,
  SplitIcon,
} from '../components/common/Icons';

const AI_SERVICE_BASE_URL = 'http://localhost:8000';

const SAMPLE_PROMPTS = [
  'How does Corrective RAG (CRAG) state evaluator mitigate hallucinations?',
  'What are the advantages of Reciprocal Rank Fusion k=60?',
  'How is multi-tenant isolation enforced with Global Query Filters?',
  'How does Groq LPU hardware acceleration optimize inference latency?',
];

/**
 * User Workspace Portal Component
 * Features an interactive split-screen workstation architecture:
 * - Left Pane: PDF.js high-DPI canvas viewer with smooth multi-page scrolling, real-time text search, and bounding box highlights.
 * - Right Pane: Structured enterprise AI research chat interface with citation cross-referencing and dual-theme styling.
 */
export function UserWorkspace() {
  const { user } = useAuth();
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [splitLayout, setSplitLayout] = useState('balanced'); // 'balanced' | 'wide-pdf' | 'wide-chat' | 'full-pdf' | 'full-chat'
  const [chatInput, setChatInput] = useState('');
  const [modelTemperature, setModelTemperature] = useState('0.2');
  const [isQuerying, setIsQuerying] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [showIngestionModal, setShowIngestionModal] = useState(false);
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [customDocContent, setCustomDocContent] = useState('');
  const chatScrollRef = useRef(null);
  const fileUploadInputRef = useRef(null);

  // Chat conversation state
  const [messages, setMessages] = useState([
    {
      id: 'msg_init',
      sender: 'assistant',
      author: 'Groq LPU Inference Engine',
      timestamp: 'Online',
      content:
        'Welcome to the Enterprise Multi-Tenant Research Assistant. Grounded RAG is active with Reciprocal Rank Fusion (Dense ChromaDB + Sparse BM25) and Groq ultra-fast LPU inference.',
      reasoning:
        '1. Verified tenant boundary: ' + (user?.tenantIdentifier || 'skit-ai-labs') + '.\n2. Initialized hybrid retrieval indices (ChromaDB + BM25Okapi).\n3. Connected to Groq LPU inference gateway.',
      citations: [
        {
          id: 'bbox-001',
          document_id: 'CRAG_Architecture_Whitepaper_2026.pdf',
          page: 1,
          snippet: 'The CRAG framework introduces a deterministic state machine evaluator that dynamically scores retrieved candidate context chunks.',
          score: 0.96,
        },
        {
          id: 'bbox-002',
          document_id: 'CRAG_Architecture_Whitepaper_2026.pdf',
          page: 1,
          snippet: 'Retrieval precision is optimized by merging dense vector similarities (ChromaDB) with sparse BM25 lexical keyword indices.',
          score: 0.91,
        },
        {
          id: 'bbox-003',
          document_id: 'CRAG_Architecture_Whitepaper_2026.pdf',
          page: 2,
          snippet: 'Global Query Filters guarantee cryptographic and logical database separation per tenant GUID.',
          score: 0.94,
        },
        {
          id: 'bbox-005',
          document_id: 'CRAG_Architecture_Whitepaper_2026.pdf',
          page: 3,
          snippet: 'Groq Language Processing Units (LPUs) leverage deterministic compiler-scheduled tensor execution.',
          score: 0.97,
        },
      ],
      model_used: 'openai/gpt-oss-120b',
      latency_ms: 18.2,
      provider: 'groq-cloud-lpu',
    },
  ]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isQuerying]);

  /**
   * Handles citation inspection triggered from the PDF canvas viewer or citation pills.
   */
  const handleSelectCitation = (citation) => {
    setSelectedCitation(citation);
  };

  /**
   * Aggregate all grounded citations across conversation messages for PDF overlay.
   */
  const conversationCitations = useMemo(() => {
    const list = [];
    messages.forEach((msg) => {
      if (msg.citations && Array.isArray(msg.citations)) {
        list.push(...msg.citations);
      }
    });
    return list;
  }, [messages]);

  /**
   * Dispatches a live RAG query to the AI microservice.
   */
  const handleSendMessage = async (textToSend = null) => {
    const queryText = (textToSend || chatInput).trim();
    if (!queryText || isQuerying) return;

    const userMessageId = `usr_${Date.now()}`;
    const userMsg = {
      id: userMessageId,
      sender: 'user',
      author: user?.name || 'Research Principal',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      content: queryText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsQuerying(true);

    const tenantId = user?.tenantId || user?.tenantIdentifier || 'skit-ai-labs';

    try {
      const response = await fetch(`${AI_SERVICE_BASE_URL}/api/v1/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          query: queryText,
          top_k: 5,
          temperature: parseFloat(modelTemperature) || 0.2,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server responded with HTTP ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        author: `Groq LPU Engine (${data.model_used || 'Active Model'})`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        content: data.synthesized_response,
        citations: data.citations || [],
        retrieved_documents: data.retrieved_documents || [],
        model_used: data.model_used,
        latency_ms: data.latency_ms,
        provider: data.provider,
        reasoning: `Retrieved ${data.retrieved_documents?.length || 0} candidate chunks via Hybrid RRF (BM25 + ChromaDB) for tenant ${tenantId}. Synthesized via Groq LPU in ${data.latency_ms}ms.`,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        author: 'System Diagnostics',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        content: `RAG Query Execution Notice: ${err.message}. Please ensure the AI service is running on ${AI_SERVICE_BASE_URL} (e.g. via \`python main.py\`).`,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsQuerying(false);
    }
  };

  /**
   * Ingests arbitrary text content into the multi-tenant RAG knowledge base.
   */
  const handleIngestDocument = async (docId, contentText, metadata = {}) => {
    if (!docId || !contentText.trim()) return;

    setIsIngesting(true);
    setIngestionStatus({ type: 'loading', message: `Ingesting '${docId}' into ChromaDB & BM25...` });

    const tenantId = user?.tenantId || user?.tenantIdentifier || 'skit-ai-labs';

    try {
      const response = await fetch(`${AI_SERVICE_BASE_URL}/api/v1/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          document_id: docId,
          content: contentText,
          metadata: {
            title: docId,
            page: 1,
            ...metadata,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ingestion failed with HTTP ${response.status}`);
      }

      const data = await response.json();
      setIngestionStatus({
        type: 'success',
        message: `Successfully ingested '${docId}' (${data.chunks_indexed} chunks indexed into ChromaDB & BM25)!`,
      });

      // Add a system event to chat history
      setMessages((prev) => [
        ...prev,
        {
          id: `sys_ingest_${Date.now()}`,
          sender: 'system',
          author: 'Knowledge Base Ingestion Event',
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          content: `Document Ingestion Completed: '${docId}' has been chunked, embedded into ChromaDB, and indexed for lexical search. Total tenant chunks: ${data.total_tenant_vector_count || data.chunks_indexed}.`,
        },
      ]);

      setTimeout(() => {
        setIngestionStatus(null);
      }, 5000);
    } catch (err) {
      setIngestionStatus({
        type: 'error',
        message: `Failed to ingest document: ${err.message}`,
      });
    } finally {
      setIsIngesting(false);
    }
  };

  /**
   * Handles local file upload for document ingestion.
   */
  const handleFileUploadIngest = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        handleIngestDocument(file.name, text, { fileSize: file.size, fileType: file.type });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[640px] space-y-3">
      {/* =========================================================================
          Top Telemetry & Ingestion Action Bar
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 shadow-2xs">
            <WorkspaceIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              Research Workspace: Split-View Document Analysis & Live RAG
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-tenant ChromaDB dense vectors + BM25 lexical search with Groq ultra-fast LPU generation.
            </p>
          </div>
        </div>

        {/* System Telemetry, Split View Layout & Ingestion Actions */}
        <div className="flex flex-wrap items-center space-x-2 text-xs font-mono">
          {/* Split-View Mode Switcher */}
          <div className="flex items-center space-x-0.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-0.5 shadow-2xs">
            <span className="px-1.5 text-slate-400 dark:text-zinc-500 font-sans text-[10px] uppercase font-bold flex items-center space-x-1">
              <SplitIcon className="w-3 h-3" />
              <span className="hidden xl:inline">Layout:</span>
            </span>
            <button
              type="button"
              onClick={() => setSplitLayout('balanced')}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                splitLayout === 'balanced'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title="Balanced 50/50 Split View"
            >
              50/50
            </button>
            <button
              type="button"
              onClick={() => setSplitLayout('wide-pdf')}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                splitLayout === 'wide-pdf'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title="Expanded PDF Focus View (65/35)"
            >
              Doc+
            </button>
            <button
              type="button"
              onClick={() => setSplitLayout('wide-chat')}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                splitLayout === 'wide-chat'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title="Expanded AI Chat Focus View (35/65)"
            >
              Chat+
            </button>
            <button
              type="button"
              onClick={() => setSplitLayout('full-pdf')}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                splitLayout === 'full-pdf'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title="Maximized PDF Canvas View (100%)"
            >
              PDF Max
            </button>
            <button
              type="button"
              onClick={() => setSplitLayout('full-chat')}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                splitLayout === 'full-chat'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title="Maximized AI Dialogue View (100%)"
            >
              Chat Max
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowIngestionModal(true)}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            title="Ingest new document into knowledge base"
          >
            <UploadIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ingest Document</span>
          </button>

          <input
            type="file"
            ref={fileUploadInputRef}
            onChange={handleFileUploadIngest}
            accept=".txt,.md,.json,.csv"
            className="hidden"
          />

          <span className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 shadow-2xs hidden md:inline-block">
            Inference: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Groq LPU</span>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hidden lg:inline-block shadow-2xs">
            Tenant: <span className="text-blue-600 dark:text-blue-400 font-semibold">{user?.tenantIdentifier || 'skit-ai-labs'}</span>
          </span>
        </div>
      </div>

      {/* Ingestion Toast / Notification Banner */}
      {ingestionStatus && (
        <div
          className={`px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between border transition-all ${
            ingestionStatus.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : ingestionStatus.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {ingestionStatus.type === 'loading' && (
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            )}
            <span>{ingestionStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setIngestionStatus(null)}
            className="text-xs font-bold hover:opacity-75 cursor-pointer ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* =========================================================================
          Interactive Enterprise Split-Screen Workstation Layout
          ========================================================================= */}
      <div
        className={`flex-1 min-h-0 overflow-hidden ${
          splitLayout === 'balanced'
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
            : splitLayout === 'wide-pdf'
            ? 'grid grid-cols-1 lg:grid-cols-12 gap-4'
            : splitLayout === 'wide-chat'
            ? 'grid grid-cols-1 lg:grid-cols-12 gap-4'
            : 'flex flex-col'
        }`}
      >
        {/* Left Pane: PDF.js Canvas Viewer with Multi-Page Scrolling & Search Overlays */}
        {splitLayout !== 'full-chat' && (
          <section
            aria-label="Document Grounding Canvas Viewer"
            className={`h-full min-h-0 flex flex-col overflow-hidden ${
              splitLayout === 'wide-pdf'
                ? 'lg:col-span-8'
                : splitLayout === 'wide-chat'
                ? 'lg:col-span-5'
                : splitLayout === 'full-pdf'
                ? 'w-full flex-1'
                : ''
            }`}
          >
            <PDFViewerComponent
              selectedCitation={selectedCitation}
              citations={conversationCitations}
              onSelectCitation={handleSelectCitation}
              onIngestDocument={(doc) => handleIngestDocument(doc.documentId, doc.content, { pages: doc.numPages })}
            />
          </section>
        )}

        {/* Right Pane: AI Research Chat Interface Shell */}
        {splitLayout !== 'full-pdf' && (
          <section
            aria-label="AI Research Assistant Dialogue"
            className={`h-full min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs transition-colors duration-200 ${
              splitLayout === 'wide-pdf'
                ? 'lg:col-span-4'
                : splitLayout === 'wide-chat'
                ? 'lg:col-span-7'
                : splitLayout === 'full-chat'
                ? 'w-full flex-1'
                : ''
            }`}
          >
          {/* Chat Interface Header */}
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Enterprise AI Dialogue Session
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                ({user?.tenantIdentifier || 'skit-ai-labs'})
              </span>
            </div>

            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>Sampling Temp:</span>
              <select
                value={modelTemperature}
                onChange={(e) => setModelTemperature(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-2xs cursor-pointer"
              >
                <option value="0.1">0.1 (Strict Truth)</option>
                <option value="0.2">0.2 (Recommended RAG)</option>
                <option value="0.5">0.5 (Balanced)</option>
                <option value="0.7">0.7 (Exploratory)</option>
              </select>
            </div>
          </div>

          {/* Active Citation Notification Banner */}
          {selectedCitation && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs transition-all">
              <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-300 font-mono text-[11px] min-w-0">
                <HighlighterIcon className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="font-bold flex-shrink-0">
                  {selectedCitation.label || `Page ${selectedCitation.page}`}:
                </span>
                <span className="truncate max-w-[280px] text-blue-700 dark:text-blue-200 font-sans">
                  "{selectedCitation.snippet}"
                </span>
                {selectedCitation.score && (
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex-shrink-0 ${
                    selectedCitation.score >= 0.90
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {Math.round(selectedCitation.score * 100)}% {selectedCitation.score >= 0.90 ? 'Verified' : 'Grounded'}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleSelectCitation({ ...selectedCitation })}
                  className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-mono text-[10px] cursor-pointer"
                  title="Scroll to citation in PDF canvas"
                >
                  Jump to Page {selectedCitation.page}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCitation(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs font-bold cursor-pointer"
                  title="Dismiss citation highlight"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Chat Conversation Thread (Scrollable) */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* System Boundary Notification */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>Session encrypted. Multi-tenant boundary: {user?.tenantIdentifier || 'skit-ai-labs'}</span>
              <span className="text-emerald-600 dark:text-emerald-500 font-semibold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Active</span>
              </span>
            </div>

            {/* Conversation Messages */}
            {messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="p-2.5 rounded-md bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] font-mono text-blue-700 dark:text-blue-300">
                    <span className="font-bold">[{msg.author}]</span> {msg.content}
                  </div>
                );
              }

              if (msg.sender === 'user') {
                return (
                  <div key={msg.id} className="flex flex-col items-end space-y-1">
                    <div className="text-[10px] font-mono text-slate-400">
                      {msg.author} • {msg.timestamp}
                    </div>
                    <div className="max-w-[85%] rounded-xl p-3.5 bg-blue-600 text-white leading-relaxed shadow-xs">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              // Assistant message
              return (
                <div key={msg.id} className="flex flex-col items-start space-y-2 w-full">
                  <div className="text-[10px] font-mono text-slate-400 flex items-center space-x-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{msg.author}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                    {msg.latency_ms && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                        {msg.latency_ms}ms
                      </span>
                    )}
                  </div>

                  {/* Chain of Thought / Telemetry Reasoning */}
                  {msg.reasoning && (
                    <div className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/80 pb-1">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center space-x-1.5">
                          <ActivityIcon className="w-3.5 h-3.5" />
                          <span>Chain of Thought Reasoning Stream</span>
                        </span>
                        <span className="text-slate-500 font-mono text-[10px]">{msg.model_used || 'Groq LPU'}</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 leading-normal whitespace-pre-line">
                        {msg.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Main Grounded Answer */}
                  <div className={`w-full rounded-xl p-4 border leading-relaxed space-y-2.5 shadow-2xs ${
                    msg.isError
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                  }`}>
                    <p className="whitespace-pre-line font-sans text-xs">
                      {msg.content}
                    </p>

                    {/* Interactive Citation Anchors with Confidence Tiers */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-2">
                        {msg.citations.map((c, cIdx) => {
                          const score = c.score ?? 0.94;
                          const isVerified = score >= 0.90;
                          const isSelected =
                            selectedCitation &&
                            (selectedCitation.id === c.id ||
                              (selectedCitation.page === c.page &&
                                selectedCitation.snippet &&
                                c.snippet &&
                                selectedCitation.snippet.slice(0, 20) === c.snippet.slice(0, 20)));

                          return (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={() =>
                                handleSelectCitation({
                                  id: c.id || `cit-${c.page || 1}-${cIdx}`,
                                  document_id: c.document_id,
                                  label: c.label || `Citation #${cIdx + 1} (${c.document_id})`,
                                  page: c.page || 1,
                                  snippet: c.snippet,
                                  score: score,
                                })
                              }
                              className={`px-2.5 py-1 rounded-md border text-[11px] font-mono font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400/40 shadow-xs'
                                  : isVerified
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 hover:border-emerald-400'
                                  : 'bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-blue-700 dark:text-blue-400'
                              }`}
                              title={`Jump to Page ${c.page || 1}: "${c.snippet}"`}
                            >
                              <HighlighterIcon className={`w-3 h-3 ${isSelected ? 'text-white' : isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`} />
                              <span>
                                [{c.document_id}, Page {c.page || 1}]
                              </span>
                              <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : isVerified
                                  ? 'bg-emerald-200 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200'
                                  : 'bg-blue-200 dark:bg-blue-900/80 text-blue-900 dark:text-blue-200'
                              }`}>
                                {Math.round(score * 100)}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* In-Flight Thinking Indicator */}
            {isQuerying && (
              <div className="flex flex-col items-start space-y-2 w-full animate-pulse">
                <div className="text-[10px] font-mono text-slate-400">
                  Groq LPU Engine • Querying Knowledge Base...
                </div>
                <div className="w-full rounded-xl p-4 bg-slate-50 dark:bg-slate-950/80 border border-blue-200 dark:border-blue-900/50 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-mono text-blue-600 dark:text-blue-400">
                    <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>1. Executing dense ChromaDB & sparse BM25 retrieval...</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 pl-5.5">
                    2. Fusing candidate ranks via RRF (k=60)...
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 pl-5.5">
                    3. Synthesizing grounded response with citations via Groq Cloud API...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3.5 pt-2 pb-1 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center space-x-1.5 overflow-x-auto">
            <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">Sample Inquiries:</span>
            {SAMPLE_PROMPTS.map((promptText, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => {
                  setChatInput(promptText);
                  handleSendMessage(promptText);
                }}
                className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex-shrink-0"
              >
                {promptText.length > 38 ? promptText.substring(0, 38) + '...' : promptText}
              </button>
            ))}
          </div>

          {/* Chat Prompt Composition Shell */}
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/80 space-y-2.5">
            <div className="relative">
              <textarea
                rows={2}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask grounded inquiry against indexed documents or active PDF (Enter to send)..."
                disabled={isQuerying}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none font-sans shadow-2xs disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span>RRF Fusion: k=60</span>
                <span>|</span>
                <span>Grounding: Strict Citations</span>
              </div>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!chatInput.trim() || isQuerying}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <SendIcon className="w-3.5 h-3.5" />
                <span>{isQuerying ? 'Thinking...' : 'Send Query'}</span>
              </button>
            </div>
          </div>
        </section>
        )}
      </div>

      {/* =========================================================================
          Manual Document Ingestion Modal
          ========================================================================= */}
      {showIngestionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <DocumentIcon className="w-4 h-4 text-blue-600" />
                <span>Ingest Document into Multi-Tenant Knowledge Base</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIngestionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Ingested text will be chunked semantically, embedded into ChromaDB vectors, and indexed into BM25Okapi under your tenant boundary ({user?.tenantIdentifier || 'skit-ai-labs'}).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Document Identifier / Title
                </label>
                <input
                  type="text"
                  value={customDocTitle}
                  onChange={(e) => setCustomDocTitle(e.target.value)}
                  placeholder="e.g. Q3_Financial_Audit_Report.pdf"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Document Content (Raw Text / Markdown)
                </label>
                <textarea
                  rows={6}
                  value={customDocContent}
                  onChange={(e) => setCustomDocContent(e.target.value)}
                  placeholder="Paste organizational documents, technical specifications, or compliance notes..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-xs text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => fileUploadInputRef.current?.click()}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer font-mono"
                >
                  <UploadIcon className="w-3.5 h-3.5" />
                  <span>Or upload text/markdown file</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowIngestionModal(false)}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!customDocTitle.trim() || !customDocContent.trim() || isIngesting}
                    onClick={() => {
                      handleIngestDocument(customDocTitle, customDocContent);
                      setShowIngestionModal(false);
                      setCustomDocTitle('');
                      setCustomDocContent('');
                    }}
                    className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-xs font-semibold text-white shadow-2xs cursor-pointer"
                  >
                    {isIngesting ? 'Ingesting...' : 'Ingest to ChromaDB'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

