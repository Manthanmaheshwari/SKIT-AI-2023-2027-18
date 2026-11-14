import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
  FitWidthIcon,
  UploadIcon,
  DocumentIcon,
  HighlighterIcon,
  CloseIcon,
  SidebarIcon,
  MaximizeIcon,
  MinimizeIcon,
  CopyIcon,
  CheckIcon,
  BookmarkIcon,
  ShieldCheckIcon,
  ActivityIcon,
} from '../common/Icons';

/**
 * Configure PDF.js Web Worker thread.
 * Uses local bundled worker URL in Vite, with CDN fallback for robust cross-environment execution.
 */
if (typeof window !== 'undefined' && pdfjsLib) {
  try {
    if (!pdfjsLib.GlobalWorkerOptions?.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        pdfWorkerUrl ||
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${
          pdfjsLib.version || '4.6.82'
        }/pdf.worker.min.mjs`;
    }
  } catch (err) {
    console.warn('PDF.js worker initialization notice:', err);
  }
}

/**
 * Calculates visual confidence tier tokens for semantic citations.
 * @param {number} [score=0.90]
 */
export function getConfidenceTier(score = 0.90) {
  if (score >= 0.90) {
    return {
      tier: 'verified',
      label: 'Verified Grounding',
      badgeText: `${Math.round(score * 100)}% Verified`,
      badgeClass: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950',
      borderClass: 'border-emerald-500',
      ringClass: 'ring-emerald-400/50',
      bgFillClass: 'bg-emerald-500/15',
      activeBgClass: 'bg-emerald-500/30',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      accentHex: '#10b981',
    };
  }
  if (score >= 0.75) {
    return {
      tier: 'grounded',
      label: 'Grounded Passage',
      badgeText: `${Math.round(score * 100)}% Grounded`,
      badgeClass: 'bg-blue-600 text-white dark:bg-blue-500 dark:text-zinc-950',
      borderClass: 'border-blue-500',
      ringClass: 'ring-blue-400/50',
      bgFillClass: 'bg-blue-500/15',
      activeBgClass: 'bg-blue-600/30',
      textClass: 'text-blue-700 dark:text-blue-400',
      accentHex: '#2563eb',
    };
  }
  if (score >= 0.50) {
    return {
      tier: 'review',
      label: 'Review Context',
      badgeText: `${Math.round(score * 100)}% Review`,
      badgeClass: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-zinc-950',
      borderClass: 'border-amber-500',
      ringClass: 'ring-amber-400/50',
      bgFillClass: 'bg-amber-500/15',
      activeBgClass: 'bg-amber-500/30',
      textClass: 'text-amber-700 dark:text-amber-400',
      accentHex: '#f59e0b',
    };
  }
  return {
    tier: 'alert',
    label: 'Unverified Alert',
    badgeText: `${Math.round(score * 100)}% Alert`,
    badgeClass: 'bg-rose-600 text-white dark:bg-rose-500 dark:text-zinc-950',
    borderClass: 'border-rose-500',
    ringClass: 'ring-rose-400/50',
    bgFillClass: 'bg-rose-500/15',
    activeBgClass: 'bg-rose-500/30',
    textClass: 'text-rose-700 dark:text-rose-400',
    accentHex: '#ef4444',
  };
}

/**
 * Enterprise verified citation annotations for multi-tenant RAG document grounding.
 */
export const DEFAULT_BOUNDING_BOXES = [
  {
    id: 'bbox-001',
    document_id: 'CRAG_Architecture_Whitepaper_2026.pdf',
    page: 1,
    x: 6.0,
    y: 17.5,
    width: 88,
    height: 5.5,
    label: 'Citation #1 (CRAG Logic)',
    snippet:
      'The CRAG framework introduces a deterministic state machine evaluator that dynamically scores retrieved candidate context chunks.',
    score: 0.96,
  },
  {
    id: 'bbox-002',
    document_id: 'CRAG_Architecture_Whitepaper_2026.pdf',
    page: 1,
    x: 6.0,
    y: 27.5,
    width: 88,
    height: 5.5,
    label: 'Citation #2 (Hybrid RRF)',
    snippet:
      'Retrieval precision is optimized by merging dense vector similarities (ChromaDB) with sparse BM25 lexical keyword indices.',
    score: 0.91,
  },
  {
    id: 'bbox-003',
    document_id: 'CRAG_Architecture_Whitepaper_2026.pdf',
    page: 2,
    x: 6.0,
    y: 17.5,
    width: 88,
    height: 5.5,
    label: 'Citation #3 (Tenant Isolation)',
    snippet:
      'Global Query Filters guarantee cryptographic and logical database separation per tenant GUID.',
    score: 0.94,
  },
  {
    id: 'bbox-004',
    document_id: 'CRAG_Architecture_Whitepaper_2026.pdf',
    page: 2,
    x: 6.0,
    y: 27.5,
    width: 88,
    height: 5.5,
    label: 'Citation #4 (DeepSeek-R1)',
    snippet:
      'Computational queries are routed to an isolated microservice container executing DeepSeek-R1 via Ollama.',
    score: 0.89,
  },
  {
    id: 'bbox-005',
    document_id: 'CRAG_Architecture_Whitepaper_2026.pdf',
    page: 3,
    x: 6.0,
    y: 15.5,
    width: 88,
    height: 5.5,
    label: 'Citation #5 (Groq LPU)',
    snippet:
      'Groq Language Processing Units (LPUs) leverage deterministic compiler-scheduled tensor execution.',
    score: 0.97,
  },
  {
    id: 'bbox-006',
    document_id: 'CRAG_Architecture_Whitepaper_2026.pdf',
    page: 3,
    x: 6.0,
    y: 41.5,
    width: 88,
    height: 5.5,
    label: 'Citation #6 (Throughput Target)',
    snippet:
      'Sustained platform concurrency exceeds 1800 requests/minute with strict multi-tenant boundary compliance.',
    score: 0.93,
  },
];

/**
 * Synthetic document text index for full search & high-DPI rendering.
 */
const SYNTHETIC_PAGES_DATA = [
  {
    page: 1,
    title: 'Corrective Retrieval-Augmented Generation (CRAG)',
    subtitle: 'Section 1.1: Asynchronous Knowledge Ingestion & LangGraph Evaluators',
    textItems: [
      { text: 'Corrective Retrieval-Augmented Generation (CRAG)', x: 6.5, y: 10.4, w: 75, h: 2.5 },
      { text: 'Section 1.1: Asynchronous Knowledge Ingestion & LangGraph Evaluators', x: 6.5, y: 13.0, w: 80, h: 2.0 },
      { text: 'Large language models frequently encounter hallucinations when queried on private enterprise corpora.', x: 6.5, y: 16.0, w: 85, h: 1.8 },
      { text: 'The CRAG framework introduces a deterministic state machine evaluator that dynamically scores retrieved candidate context chunks.', x: 6.5, y: 18.0, w: 87, h: 1.8 },
      { text: 'Section 1.2: Hybrid Reciprocal Rank Fusion (RRF)', x: 6.5, y: 25.3, w: 70, h: 2.0 },
      { text: 'Retrieval precision is optimized by merging dense vector similarities (ChromaDB) with sparse BM25 lexical keyword indices.', x: 6.5, y: 28.0, w: 86, h: 1.8 },
      { text: 'Candidate chunks are re-ranked according to reciprocal rank fusion formula with smoothing parameter k=60.', x: 6.5, y: 30.2, w: 86, h: 1.8 },
      { text: 'RRF_Score(d ∈ D) = ∑_{m ∈ M} [ 1 / ( k + rank_m(d) ) ]', x: 9.4, y: 35.5, w: 70, h: 2.5 },
      { text: 'When LangGraph evaluator confidence falls below the 0.82 threshold, fallback query rewriting is automatically dispatched across RabbitMQ.', x: 6.5, y: 41.5, w: 87, h: 1.8 },
      { text: 'Empirical Benchmark Targets: Retrieval Recall Target: ≥ 0.9400, Mean Reciprocal Rank (MRR): ≥ 0.8845.', x: 8.2, y: 49.0, w: 82, h: 2.0 },
      { text: 'Vector Distance Metric: Cosine (ChromaDB), Smoothing Constant: k = 60.', x: 8.2, y: 53.0, w: 75, h: 1.8 },
    ],
  },
  {
    page: 2,
    title: 'Multi-Tenant Logical Isolation & Security Boundaries',
    subtitle: 'Section 2.1: Entity Framework Core Global Query Filters',
    textItems: [
      { text: 'Multi-Tenant Logical Isolation & Security Boundaries', x: 6.5, y: 10.4, w: 75, h: 2.5 },
      { text: 'Section 2.1: Entity Framework Core Global Query Filters', x: 6.5, y: 13.0, w: 80, h: 2.0 },
      { text: 'Every persisted record is tagged with an immutable Tenant GUID.', x: 6.5, y: 16.0, w: 85, h: 1.8 },
      { text: 'The backend ASP.NET gateway validates cryptographically signed JWT claims on every HTTP request.', x: 6.5, y: 18.0, w: 87, h: 1.8 },
      { text: 'Global Query Filters guarantee cryptographic and logical database separation per tenant GUID.', x: 6.5, y: 20.2, w: 87, h: 1.8 },
      { text: 'Section 2.2: DeepSeek-R1 Sandboxed Local Inference', x: 6.5, y: 25.3, w: 70, h: 2.0 },
      { text: 'Computational queries are routed to an isolated microservice container executing DeepSeek-R1 via Ollama.', x: 6.5, y: 28.0, w: 86, h: 1.8 },
      { text: 'Mathematical proofs and code snippets are verified inside sandboxed runtimes with zero external data exfiltration.', x: 6.5, y: 30.2, w: 86, h: 1.8 },
      { text: 'Security Enforcement Architecture: ChromaDB vector collections partitioned with tenant-scoped metadata predicates.', x: 8.2, y: 35.5, w: 80, h: 2.5 },
      { text: 'Cryptographic hash tokens and tenant GUID validation prevent unauthorized cross-tenant retrieval leakage.', x: 6.5, y: 43.5, w: 87, h: 1.8 },
      { text: 'Audit trail logging registers every query vector with SHA-256 compliance timestamps.', x: 6.5, y: 47.0, w: 85, h: 1.8 },
    ],
  },
  {
    page: 3,
    title: 'Groq LPU Hardware Acceleration & Empirical Benchmarks',
    subtitle: 'Section 3.1: Deterministic Tensor Streaming Architecture',
    textItems: [
      { text: 'Groq LPU Hardware Acceleration & Empirical Benchmarks', x: 6.5, y: 10.4, w: 78, h: 2.5 },
      { text: 'Section 3.1: Deterministic Tensor Streaming Architecture', x: 6.5, y: 13.0, w: 80, h: 2.0 },
      { text: 'Groq Language Processing Units (LPUs) leverage deterministic compiler-scheduled tensor execution.', x: 6.5, y: 16.0, w: 87, h: 1.8 },
      { text: 'Delivers instantaneous response generation with sub-20ms time-to-first-token (TTFT) across large context windows.', x: 6.5, y: 18.0, w: 87, h: 1.8 },
      { text: 'Section 3.2: High-Throughput Token Generation Benchmark', x: 6.5, y: 25.3, w: 72, h: 2.0 },
      { text: 'Empirical benchmark comparison demonstrates 10x lower latency compared to legacy cloud GPUs.', x: 6.5, y: 28.0, w: 86, h: 1.8 },
      { text: 'Groq LPU: 480 tok/sec, TTFT: 18.2ms. Cloud A100: 95 tok/sec, TTFT: 142.0ms. Local CPU: 12 tok/sec, TTFT: 820.0ms.', x: 8.2, y: 34.5, w: 82, h: 3.5 },
      { text: 'Sustained platform concurrency exceeds 1800 requests/minute with strict multi-tenant boundary compliance.', x: 6.5, y: 42.5, w: 87, h: 1.8 },
      { text: 'Model runtime endpoint: openai/gpt-oss-120b with Groq Cloud LPU acceleration.', x: 6.5, y: 46.0, w: 80, h: 1.8 },
      { text: 'Audit verification hash: sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069', x: 6.5, y: 52.0, w: 85, h: 1.8 },
    ],
  },
];

/**
 * Standard Available Research Documents Preset
 */
export const AVAILABLE_DOCUMENTS = [
  {
    id: 'crag-whitepaper',
    title: 'CRAG_Architecture_Whitepaper_2026.pdf',
    type: 'synthetic',
    pages: 3,
    description: 'CRAG state evaluator, Hybrid RRF k=60, EF Core isolation, Groq LPU benchmarks',
  },
  {
    id: 'weekly-progress-report',
    title: 'SKIT_AI_Weekly_Report_2026.pdf',
    url: '/documents/SKIT_AI_Weekly_Report_2026.pdf',
    type: 'pdf',
    description: 'Weekly engineering milestone attestation, Form-3 verified audit dataset',
  },
];

/**
 * Enterprise Split-View PDF.js Canvas Viewer Component
 */
export function PDFViewerComponent({
  documentSource = null,
  initialTitle = 'CRAG_Architecture_Whitepaper_2026.pdf',
  onSelectCitation,
  selectedCitation = null,
  onIngestDocument,
  boundingBoxes = DEFAULT_BOUNDING_BOXES,
  citations = [],
}) {
  // Document and Page State
  const [activeDocSource, setActiveDocSource] = useState(documentSource);
  const [documentTitle, setDocumentTitle] = useState(initialTitle);
  const [numPages, setNumPages] = useState(3);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [scale, setScale] = useState(1.15);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [sidebarMode, setSidebarMode] = useState('none'); // 'none' | 'thumbnails' | 'citations'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeCitation, setActiveCitation] = useState(null);
  const [citationFilter, setCitationFilter] = useState('all'); // 'all' | 'verified' | 'review'
  const [copiedSnippetId, setCopiedSnippetId] = useState(null);

  // Text Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [extractedPdfPagesText, setExtractedPdfPagesText] = useState([]);
  const [isSearchingText, setIsSearchingText] = useState(false);

  // DOM and Execution Handles
  const containerWrapperRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const pageRefs = useRef({});
  const canvasRefs = useRef({});
  const thumbnailCanvasRefs = useRef({});
  const activeRenderTasksRef = useRef({});
  const activeThumbnailTasksRef = useRef({});
  const pdfDocumentRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const isScrollingInternallyRef = useRef(false);

  // Synchronize documentSource prop changes
  useEffect(() => {
    if (documentSource !== undefined && documentSource !== activeDocSource) {
      setActiveDocSource(documentSource);
    }
  }, [documentSource]);

  /**
   * High-Resolution Canvas Drawing Fallback Engine.
   * Renders stark-white paper with high-contrast typography, formulas, and demarcations.
   */
  const renderFallbackPageToCanvas = useCallback((canvas, pageNum, currentScale) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseWidth = 680;
    const baseHeight = 940;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(baseWidth * currentScale * dpr);
    canvas.height = Math.floor(baseHeight * currentScale * dpr);
    canvas.style.width = `${Math.floor(baseWidth * currentScale)}px`;
    canvas.style.height = `${Math.floor(baseHeight * currentScale)}px`;

    ctx.save();
    ctx.scale(dpr * currentScale, dpr * currentScale);

    // Stark crisp pure white paper sheet
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    // Subtle boundary rule
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, baseWidth - 2, baseHeight - 2);

    // Header metadata rule
    ctx.fillStyle = '#475569';
    ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText('ENTERPRISE AI RESEARCH PLATFORM — SPECIFICATION DRAFT', 44, 48);
    ctx.fillStyle = '#64748b';
    ctx.fillText(`PAGE ${String(pageNum).padStart(2, '0')} / 03`, baseWidth - 140, 48);

    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(44, 60);
    ctx.lineTo(baseWidth - 44, 60);
    ctx.stroke();

    // Body content by page index
    if (pageNum === 1) {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Corrective Retrieval-Augmented Generation (CRAG)', 44, 98);

      ctx.fillStyle = '#2563eb';
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Section 1.1: Asynchronous Knowledge Ingestion & LangGraph Evaluators', 44, 122);

      ctx.fillStyle = '#334155';
      ctx.font = '12px/18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Large language models frequently encounter hallucinations when queried on private enterprise', 44, 150);
      ctx.fillText('corpora. The CRAG framework introduces a deterministic state machine evaluator that dynamically', 44, 170);
      ctx.fillText('scores retrieved candidate context chunks prior to final inference synthesis.', 44, 190);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Section 1.2: Hybrid Reciprocal Rank Fusion (RRF)', 44, 238);

      ctx.fillStyle = '#334155';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Retrieval precision is optimized by merging dense vector similarities (ChromaDB) with', 44, 264);
      ctx.fillText('sparse BM25 lexical keyword indices. Candidate chunks are re-ranked according to:', 44, 284);

      // Mathematical Formula Card
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(44, 306, baseWidth - 88, 54);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(44, 306, baseWidth - 88, 54);

      ctx.fillStyle = '#1d4ed8';
      ctx.font = '600 12px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText('RRF_Score(d ∈ D) = ∑_{m ∈ M} [ 1 / ( k + rank_m(d) ) ]', 64, 338);

      ctx.fillStyle = '#334155';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('When LangGraph evaluator confidence falls below the 0.82 threshold, fallback query', 44, 390);
      ctx.fillText('rewriting is automatically dispatched across RabbitMQ asynchronous message queues.', 44, 410);

      // Benchmark Metadata Table Box
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(44, 440, baseWidth - 88, 70);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(44, 440, baseWidth - 88, 70);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Empirical Benchmark Targets:', 56, 462);
      ctx.fillStyle = '#475569';
      ctx.font = '11px ui-monospace, monospace';
      ctx.fillText('• Retrieval Recall Target: ≥ 0.9400        • Mean Reciprocal Rank (MRR): ≥ 0.8845', 56, 482);
      ctx.fillText('• Smoothing Constant: k = 60              • Vector Distance Metric: Cosine (ChromaDB)', 56, 498);
    } else if (pageNum === 2) {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Multi-Tenant Logical Isolation & Security Boundaries', 44, 98);

      ctx.fillStyle = '#2563eb';
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Section 2.1: Entity Framework Core Global Query Filters', 44, 122);

      ctx.fillStyle = '#334155';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Every persisted record is tagged with an immutable Tenant GUID. The backend ASP.NET gateway', 44, 150);
      ctx.fillText('validates cryptographically signed JWT claims on every HTTP request and attaches EF Core', 44, 170);
      ctx.fillText('global query filters, guaranteeing strict logical isolation across concurrent organizations.', 44, 190);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Section 2.2: DeepSeek-R1 Sandboxed Local Inference', 44, 238);

      ctx.fillStyle = '#334155';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Computational queries are routed to an isolated microservice container executing DeepSeek-R1', 44, 264);
      ctx.fillText('via Ollama. Mathematical proofs and code snippets are verified inside sandboxed runtimes.', 44, 284);

      // Architectural callout
      ctx.fillStyle = '#eff6ff';
      ctx.fillRect(44, 314, baseWidth - 88, 62);
      ctx.strokeStyle = '#bfdbfe';
      ctx.strokeRect(44, 314, baseWidth - 88, 62);

      ctx.fillStyle = '#1e40af';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Security Enforcement Architecture:', 56, 336);
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('All vector embeddings stored in ChromaDB are partitioned with tenant-scoped metadata predicates.', 56, 356);

      // Compliance signature box
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(44, 400, baseWidth - 88, 70);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(44, 400, baseWidth - 88, 70);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Audit Trail & Compliance Verification:', 56, 422);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px ui-monospace, monospace';
      ctx.fillText('• Tenant Authorization: AES-256 JWT       • Zero Cross-Tenant Retrieval Guarantee', 56, 442);
      ctx.fillText('• Cryptographic Hash: sha256:4a9c...      • SOC2 Type II Attestation Compliant', 56, 458);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Groq LPU Hardware Acceleration & Empirical Benchmarks', 44, 98);

      ctx.fillStyle = '#2563eb';
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Section 3.1: Deterministic Tensor Streaming Architecture', 44, 122);

      ctx.fillStyle = '#334155';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Groq Language Processing Units (LPUs) leverage deterministic compiler-scheduled tensor execution.', 44, 150);
      ctx.fillText('This architecture eliminates dynamic cache misses, delivering instantaneous response generation with', 44, 170);
      ctx.fillText('sub-20ms time-to-first-token (TTFT) across long-context enterprise whitepaper documents.', 44, 190);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Section 3.2: High-Throughput Token Generation Benchmark', 44, 238);

      ctx.fillStyle = '#334155';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Empirical benchmark comparisons demonstrate a 10x throughput surge over legacy cloud GPU clusters:', 44, 264);

      // Benchmark Matrix Table Card
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(44, 290, baseWidth - 88, 100);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(44, 290, baseWidth - 88, 100);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillText('HARDWARE BACKEND       THROUGHPUT       TTFT (ms)     POWER EFFICIENCY', 56, 314);
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(56, 322);
      ctx.lineTo(baseWidth - 56, 322);
      ctx.stroke();

      ctx.fillStyle = '#16a34a';
      ctx.fillText('Groq LPU Node          480 tok/sec      18.2 ms       100% (Baseline)', 56, 342);
      ctx.fillStyle = '#475569';
      ctx.fillText('Nvidia A100 (Cloud)     95 tok/sec     142.0 ms        28% Normalized', 56, 362);
      ctx.fillText('Host Local CPU          12 tok/sec     820.0 ms         4% Normalized', 56, 380);

      ctx.fillStyle = '#334155';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Sustained platform concurrency exceeds 1800 requests/minute with strict multi-tenant boundary', 44, 420);
      ctx.fillText('enforcement and zero cross-tenant memory buffer leakage under peak load.', 44, 440);
    }

    // Confidential Footer
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(44, baseHeight - 55);
    ctx.lineTo(baseWidth - 44, baseHeight - 55);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '600 9px ui-monospace, SFMono-Regular, monospace';
    ctx.fillText('CONFIDENTIAL & PROPRIETARY — ENTERPRISE MULTI-TENANT AI RESEARCH PLATFORM 2026', 44, baseHeight - 38);

    ctx.restore();
  }, []);

  /**
   * Asynchronously renders a single PDF page onto target canvas with cancellation guards.
   */
  const renderPage = useCallback(
    async (pageNumber) => {
      const canvas = canvasRefs.current[pageNumber];
      if (!canvas) return;

      // Cancel previous in-flight render task to prevent canvas collision exceptions
      if (activeRenderTasksRef.current[pageNumber]) {
        try {
          activeRenderTasksRef.current[pageNumber].cancel();
        } catch (e) {
          // Expected cancellation
        }
        delete activeRenderTasksRef.current[pageNumber];
      }

      // If no live PDF.js document handle exists, render high-DPI synthetic fallback
      if (!pdfDocumentRef.current) {
        renderFallbackPageToCanvas(canvas, pageNumber, scale);
        return;
      }

      try {
        const page = await pdfDocumentRef.current.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: transform,
        };

        const renderTask = page.render(renderContext);
        activeRenderTasksRef.current[pageNumber] = renderTask;

        await renderTask.promise;
        delete activeRenderTasksRef.current[pageNumber];
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          renderFallbackPageToCanvas(canvas, pageNumber, scale);
        }
      }
    },
    [scale, renderFallbackPageToCanvas]
  );

  /**
   * Renders thumbnail canvas for the sidebar navigation strip.
   */
  const renderThumbnail = useCallback(
    async (pageNumber) => {
      const canvas = thumbnailCanvasRefs.current[pageNumber];
      if (!canvas) return;

      const thumbScale = 0.22;

      if (activeThumbnailTasksRef.current[pageNumber]) {
        try {
          activeThumbnailTasksRef.current[pageNumber].cancel();
        } catch (e) {}
        delete activeThumbnailTasksRef.current[pageNumber];
      }

      if (!pdfDocumentRef.current) {
        renderFallbackPageToCanvas(canvas, pageNumber, thumbScale);
        return;
      }

      try {
        const page = await pdfDocumentRef.current.getPage(pageNumber);
        const viewport = page.getViewport({ scale: thumbScale });
        const context = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

        const renderTask = page.render({
          canvasContext: context,
          viewport,
          transform,
        });
        activeThumbnailTasksRef.current[pageNumber] = renderTask;
        await renderTask.promise;
        delete activeThumbnailTasksRef.current[pageNumber];
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          renderFallbackPageToCanvas(canvas, pageNumber, thumbScale);
        }
      }
    },
    [renderFallbackPageToCanvas]
  );

  /**
   * Extracts text content and token bounding coordinates from live PDF document.
   */
  const extractPdfTextContent = async (doc) => {
    setIsSearchingText(true);
    try {
      const extractedPages = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });

        const items = textContent.items.map((item) => {
          const tx = item.transform;
          const x = tx[4];
          const y = viewport.height - tx[5] - (item.height || 10);
          return {
            str: item.str,
            xPct: Math.max(0, Math.min(100, (x / viewport.width) * 100)),
            yPct: Math.max(0, Math.min(100, (y / viewport.height) * 100)),
            wPct: Math.max(0.5, Math.min(100, ((item.width || 30) / viewport.width) * 100)),
            hPct: Math.max(1, Math.min(20, (((item.height || 12) * 1.3) / viewport.height) * 100)),
          };
        });

        extractedPages.push({
          page: p,
          items,
          fullText: items.map((i) => i.str).join(' '),
        });
      }
      setExtractedPdfPagesText(extractedPages);
    } catch (err) {
      console.warn('PDF text extraction error:', err);
    } finally {
      setIsSearchingText(false);
    }
  };

  /**
   * Loads document from URI or initializes standard fallback research document.
   */
  const loadDocument = useCallback(async () => {
    setIsLoading(true);
    setLoadingError(null);

    try {
      if (activeDocSource && typeof activeDocSource === 'string' && activeDocSource !== 'synthetic') {
        const loadingTask = pdfjsLib.getDocument({
          url: activeDocSource,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        pdfDocumentRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInputValue('1');
        await extractPdfTextContent(doc);
      } else {
        pdfDocumentRef.current = null;
        setNumPages(3);
        setExtractedPdfPagesText([]);
      }
    } catch (err) {
      setLoadingError(err.message || 'Failed to load PDF file.');
      pdfDocumentRef.current = null;
      setNumPages(3);
    } finally {
      setIsLoading(false);
    }
  }, [activeDocSource]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Re-render visible canvases on page count or zoom scale update
  useEffect(() => {
    for (let p = 1; p <= numPages; p++) {
      renderPage(p);
      if (sidebarMode === 'thumbnails') {
        renderThumbnail(p);
      }
    }

    return () => {
      Object.keys(activeRenderTasksRef.current).forEach((pageKey) => {
        try {
          activeRenderTasksRef.current[pageKey]?.cancel();
        } catch (e) {}
      });
      activeRenderTasksRef.current = {};

      Object.keys(activeThumbnailTasksRef.current).forEach((pageKey) => {
        try {
          activeThumbnailTasksRef.current[pageKey]?.cancel();
        } catch (e) {}
      });
      activeThumbnailTasksRef.current = {};
    };
  }, [numPages, scale, sidebarMode, renderPage, renderThumbnail]);

  /**
   * Continuous scroll tracking to detect current page in viewport (Scroll-Spy).
   */
  const handleScroll = () => {
    if (!scrollContainerRef.current || isScrollingInternallyRef.current) return;
    const container = scrollContainerRef.current;
    const containerTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const containerCenter = containerTop + containerHeight / 3;

    for (let p = 1; p <= numPages; p++) {
      const pageEl = pageRefs.current[p];
      if (pageEl) {
        const pageTop = pageEl.offsetTop - container.offsetTop;
        const pageBottom = pageTop + pageEl.clientHeight;

        if (containerCenter >= pageTop && containerCenter <= pageBottom) {
          if (currentPage !== p) {
            setCurrentPage(p);
            setPageInputValue(String(p));
          }
          break;
        }
      }
    }
  };

  /**
   * Explicit Navigation: Smoothly scrolls to target page index.
   */
  const scrollToPage = useCallback(
    (targetPage) => {
      const clampedPage = Math.max(1, Math.min(targetPage, numPages));
      setCurrentPage(clampedPage);
      setPageInputValue(String(clampedPage));

      const targetEl = pageRefs.current[clampedPage];
      if (targetEl && scrollContainerRef.current) {
        isScrollingInternallyRef.current = true;
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          isScrollingInternallyRef.current = false;
        }, 600);
      }
    },
    [numPages]
  );

  /**
   * Centered Navigation: Smoothly centers an exact target coordinate or bounding box into view.
   */
  const scrollToTargetCoordinate = useCallback(
    (pageNumber, yPercentage = 20) => {
      const clampedPage = Math.max(1, Math.min(pageNumber, numPages));
      setCurrentPage(clampedPage);
      setPageInputValue(String(clampedPage));

      const targetEl = pageRefs.current[clampedPage];
      const container = scrollContainerRef.current;
      if (targetEl && container) {
        isScrollingInternallyRef.current = true;
        const pageTop = targetEl.offsetTop - container.offsetTop;
        const targetPixelY = pageTop + (yPercentage / 100) * targetEl.clientHeight;
        const targetScrollTop = Math.max(0, targetPixelY - container.clientHeight / 2.5);

        container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        setTimeout(() => {
          isScrollingInternallyRef.current = false;
        }, 600);
      }
    },
    [numPages]
  );

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(pageInputValue, 10);
    if (!isNaN(parsed)) {
      scrollToPage(parsed);
    } else {
      setPageInputValue(String(currentPage));
    }
  };

  /**
   * Unified Citation Pool:
   * Merges DEFAULT_BOUNDING_BOXES with any dynamically passed citations or selectedCitation.
   */
  const unifiedCitations = useMemo(() => {
    const pool = [...boundingBoxes];

    // Merge external citations passed via props
    if (citations && citations.length > 0) {
      citations.forEach((c, idx) => {
        const exists = pool.some(
          (b) =>
            b.id === c.id ||
            (b.page === c.page && b.snippet && c.snippet && b.snippet.includes(c.snippet.slice(0, 20)))
        );
        if (!exists) {
          pool.push({
            id: c.id || `ext-cit-${idx}`,
            document_id: c.document_id || documentTitle,
            page: c.page || 1,
            x: c.x ?? 6.0,
            y: c.y ?? (18.0 + (idx % 3) * 10),
            width: c.width ?? 88,
            height: c.height ?? 6.0,
            label: c.label || `Citation #${pool.length + 1}`,
            snippet: c.snippet || 'Grounded passage assertion.',
            score: c.score ?? 0.94,
          });
        }
      });
    }

    // Ensure selectedCitation is represented if provided
    if (selectedCitation && selectedCitation.page) {
      const matchInPool = pool.find(
        (b) =>
          b.id === selectedCitation.id ||
          (b.page === selectedCitation.page &&
            b.snippet &&
            selectedCitation.snippet &&
            (b.snippet.includes(selectedCitation.snippet.slice(0, 20)) ||
              selectedCitation.snippet.includes(b.snippet.slice(0, 20))))
      );

      if (!matchInPool) {
        pool.push({
          id: selectedCitation.id || `selected-cit-${Date.now()}`,
          document_id: selectedCitation.document_id || documentTitle,
          page: selectedCitation.page,
          x: selectedCitation.x ?? 6.0,
          y: selectedCitation.y ?? 18.0,
          width: selectedCitation.width ?? 88,
          height: selectedCitation.height ?? 6.0,
          label: selectedCitation.label || `Citation (Page ${selectedCitation.page})`,
          snippet: selectedCitation.snippet || 'Referenced grounding assertion.',
          score: selectedCitation.score ?? 0.95,
        });
      }
    }

    return pool;
  }, [boundingBoxes, citations, selectedCitation, documentTitle]);

  /**
   * Synchronize selection when parent passes `selectedCitation`
   */
  useEffect(() => {
    if (selectedCitation && selectedCitation.page) {
      const matched = unifiedCitations.find(
        (b) =>
          b.id === selectedCitation.id ||
          (b.page === selectedCitation.page &&
            b.snippet &&
            selectedCitation.snippet &&
            (b.snippet.includes(selectedCitation.snippet.slice(0, 20)) ||
              selectedCitation.snippet.includes(b.snippet.slice(0, 20))))
      );

      const target = matched || {
        id: selectedCitation.id || `temp-cit-${Date.now()}`,
        ...selectedCitation,
        x: selectedCitation.x ?? 6.0,
        y: selectedCitation.y ?? 18.0,
        width: selectedCitation.width ?? 88,
        height: selectedCitation.height ?? 6.0,
      };

      setActiveCitation(target);
      scrollToTargetCoordinate(target.page, target.y);
    }
  }, [selectedCitation, unifiedCitations, scrollToTargetCoordinate]);

  /**
   * Local file upload handler with automatic text extraction and RAG ingestion.
   */
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDocumentTitle(file.name);
    setIsLoading(true);

    const fileReader = new FileReader();
    fileReader.onload = async function () {
      const typedArray = new Uint8Array(this.result);
      try {
        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
        const doc = await loadingTask.promise;
        pdfDocumentRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInputValue('1');
        setIsLoading(false);

        await extractPdfTextContent(doc);

        try {
          let fullText = '';
          for (let p = 1; p <= doc.numPages; p++) {
            const page = await doc.getPage(p);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            if (pageText.trim()) {
              fullText += `\n[Page ${p}]\n` + pageText;
            }
          }
          if (fullText.trim() && onIngestDocument) {
            onIngestDocument({
              documentId: file.name,
              content: fullText.trim(),
              numPages: doc.numPages,
            });
          }
        } catch (extractErr) {
          console.warn('Text extraction for RAG ingestion warning:', extractErr);
        }
      } catch (err) {
        setLoadingError('Failed to parse uploaded PDF.');
        pdfDocumentRef.current = null;
        setNumPages(3);
        setIsLoading(false);
      }
    };
    fileReader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  /**
   * Select a preset document (CRAG Whitepaper vs SKIT AI Report)
   */
  const handleSelectPresetDocument = (docConfig) => {
    setDocumentTitle(docConfig.title);
    if (docConfig.url) {
      setActiveDocSource(docConfig.url);
    } else {
      setActiveDocSource('synthetic');
      pdfDocumentRef.current = null;
      setNumPages(docConfig.pages || 3);
      setCurrentPage(1);
      setPageInputValue('1');
    }
  };

  // Zoom controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.15, 0.5));
  const handleFitWidth = () => {
    if (scrollContainerRef.current) {
      const availableWidth = scrollContainerRef.current.clientWidth - 80;
      const baseWidth = 680;
      const newScale = Math.max(0.6, Math.min(availableWidth / baseWidth, 2.0));
      setScale(parseFloat(newScale.toFixed(2)));
    } else {
      setScale(1.15);
    }
  };
  const handleFitPage = () => {
    if (scrollContainerRef.current) {
      const availableHeight = scrollContainerRef.current.clientHeight - 60;
      const baseHeight = 940;
      const newScale = Math.max(0.5, Math.min(availableHeight / baseHeight, 1.6));
      setScale(parseFloat(newScale.toFixed(2)));
    } else {
      setScale(0.85);
    }
  };
  const handleResetZoom = () => setScale(1.0);

  // Toggle Fullscreen Viewport Mode
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerWrapperRef.current?.requestFullscreen) {
        containerWrapperRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Global Keyboard Navigation (Cmd+F, Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape') {
        if (searchQuery) setSearchQuery('');
        if (activeCitation) setActiveCitation(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, activeCitation]);

  // =========================================================================
  // Text Search Computation Engine
  // =========================================================================
  const allSearchMatches = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return [];

    const matches = [];
    const normalizedQuery = isCaseSensitive ? query : query.toLowerCase();

    // Check if live PDF text was extracted
    if (extractedPdfPagesText.length > 0) {
      extractedPdfPagesText.forEach((pageData) => {
        pageData.items.forEach((item, itemIdx) => {
          const itemText = isCaseSensitive ? item.str : item.str.toLowerCase();
          if (itemText.includes(normalizedQuery)) {
            matches.push({
              id: `match-${pageData.page}-${itemIdx}`,
              page: pageData.page,
              snippet: item.str,
              x: item.xPct,
              y: item.yPct,
              width: item.wPct,
              height: item.hPct,
            });
          }
        });
      });
    } else {
      // Use rich synthetic document index with sub-character bounding box calculation
      SYNTHETIC_PAGES_DATA.forEach((pageData) => {
        pageData.textItems.forEach((item, itemIdx) => {
          const itemText = isCaseSensitive ? item.text : item.text.toLowerCase();
          const matchIdx = itemText.indexOf(normalizedQuery);
          if (matchIdx !== -1) {
            const charRatio = matchIdx / Math.max(1, item.text.length);
            const queryRatio = normalizedQuery.length / Math.max(1, item.text.length);
            const matchX = item.x + charRatio * item.w;
            const matchW = Math.max(item.w * queryRatio, 3.5);

            matches.push({
              id: `syn-match-${pageData.page}-${itemIdx}`,
              page: pageData.page,
              snippet: item.text,
              x: Math.max(4, Math.min(92, matchX)),
              y: Math.max(2, item.y - 0.2),
              width: Math.min(matchW, 88),
              height: Math.max(item.h, 2.2),
            });
          }
        });
      });
    }

    return matches;
  }, [searchQuery, isCaseSensitive, extractedPdfPagesText]);

  // Reset active match index on query change
  useEffect(() => {
    setActiveMatchIndex(0);
    if (allSearchMatches.length > 0) {
      scrollToTargetCoordinate(allSearchMatches[0].page, allSearchMatches[0].y);
    }
  }, [searchQuery, isCaseSensitive, allSearchMatches.length, scrollToTargetCoordinate]);

  // Navigate to Next Match
  const handleNextMatch = () => {
    if (allSearchMatches.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % allSearchMatches.length;
    setActiveMatchIndex(nextIdx);
    scrollToTargetCoordinate(allSearchMatches[nextIdx].page, allSearchMatches[nextIdx].y);
  };

  // Navigate to Previous Match
  const handlePrevMatch = () => {
    if (allSearchMatches.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + allSearchMatches.length) % allSearchMatches.length;
    setActiveMatchIndex(prevIdx);
    scrollToTargetCoordinate(allSearchMatches[prevIdx].page, allSearchMatches[prevIdx].y);
  };

  // Filter citations by query or confidence tier
  const filteredCitations = useMemo(() => {
    return unifiedCitations.filter((item) => {
      if (citationFilter === 'verified' && item.score < 0.90) return false;
      if (citationFilter === 'review' && item.score >= 0.90) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.snippet.toLowerCase().includes(q) ||
        String(item.page).includes(q)
      );
    });
  }, [unifiedCitations, citationFilter, searchQuery]);

  /**
   * Copy citation snippet to clipboard
   */
  const handleCopySnippet = (citation) => {
    if (!citation?.snippet) return;
    navigator.clipboard.writeText(citation.snippet).then(() => {
      setCopiedSnippetId(citation.id);
      setTimeout(() => setCopiedSnippetId(null), 2500);
    });
  };

  return (
    <div
      ref={containerWrapperRef}
      className={`w-full h-full flex flex-col bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-xs transition-colors duration-200 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* =========================================================================
          Primary Enterprise Header Toolbar
          ========================================================================= */}
      <header className="px-3.5 py-2.5 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 text-xs select-none transition-colors duration-200">
        {/* Document Identifier, Preset Switcher & Upload */}
        <div className="flex items-center space-x-2.5 min-w-0">
          {/* Toggle Sidebar (Thumbnails or Citations) */}
          <div className="flex items-center space-x-0.5 bg-slate-50 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 rounded-md p-0.5">
            <button
              type="button"
              onClick={() =>
                setSidebarMode((prev) => (prev === 'thumbnails' ? 'none' : 'thumbnails'))
              }
              className={`p-1 rounded transition-colors cursor-pointer ${
                sidebarMode === 'thumbnails'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700'
              }`}
              title="Toggle Page Navigation Thumbnails"
              aria-label="Toggle Page Thumbnails"
            >
              <SidebarIcon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() =>
                setSidebarMode((prev) => (prev === 'citations' ? 'none' : 'citations'))
              }
              className={`p-1 rounded transition-colors cursor-pointer flex items-center space-x-1 ${
                sidebarMode === 'citations'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700'
              }`}
              title="Toggle Visual Citations Inspector"
              aria-label="Toggle Citations Inspector"
            >
              <BookmarkIcon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono font-bold px-1 rounded-full bg-blue-100 text-blue-700 dark:bg-zinc-700 dark:text-zinc-200">
                {unifiedCitations.length}
              </span>
            </button>
          </div>

          <div className="p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-zinc-700 flex-shrink-0">
            <DocumentIcon className="w-4 h-4" />
          </div>

          {/* Document Preset Selector */}
          <div className="flex flex-col min-w-0">
            <select
              value={
                activeDocSource === '/documents/SKIT_AI_Weekly_Report_2026.pdf'
                  ? 'weekly-progress-report'
                  : 'crag-whitepaper'
              }
              onChange={(e) => {
                const doc = AVAILABLE_DOCUMENTS.find((d) => d.id === e.target.value);
                if (doc) handleSelectPresetDocument(doc);
              }}
              className="font-medium text-slate-800 dark:text-zinc-100 bg-transparent border-0 py-0 pl-0 pr-6 text-xs cursor-pointer focus:ring-0 truncate max-w-[140px] sm:max-w-[200px] lg:max-w-[240px]"
              title={documentTitle}
            >
              <option value="crag-whitepaper">CRAG_Architecture_Whitepaper_2026.pdf</option>
              <option value="weekly-progress-report">SKIT_AI_Weekly_Report_2026.pdf</option>
            </select>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              PDF.js Canvas • {numPages} {numPages === 1 ? 'Page' : 'Pages'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors shadow-2xs cursor-pointer"
            title="Upload research PDF from local workstation"
            aria-label="Upload PDF"
          >
            <UploadIcon className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="application/pdf"
            className="hidden"
          />
        </div>

        {/* Page Navigation Controls */}
        <div className="flex items-center space-x-1">
          <div className="flex items-center space-x-0.5 bg-slate-50 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 rounded-md p-0.5">
            {/* First Page */}
            <button
              type="button"
              onClick={() => scrollToPage(1)}
              disabled={currentPage <= 1}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="First Page (|<<)"
              aria-label="First Page"
            >
              <ChevronsLeftIcon className="w-3.5 h-3.5" />
            </button>

            {/* Previous Page */}
            <button
              type="button"
              onClick={() => scrollToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Previous Page (<)"
              aria-label="Previous Page"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </button>

            {/* Jump-to-Page Input */}
            <form onSubmit={handlePageInputSubmit} className="flex items-center px-1">
              <input
                type="text"
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onBlur={handlePageInputSubmit}
                aria-label="Current page number"
                className="w-8 py-0.5 text-center font-mono text-[11px] font-semibold bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="ml-1 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                / {numPages}
              </span>
            </form>

            {/* Next Page */}
            <button
              type="button"
              onClick={() => scrollToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Next Page (>)"
              aria-label="Next Page"
            >
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => scrollToPage(numPages)}
              disabled={currentPage >= numPages}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Last Page (>>|)"
              aria-label="Last Page"
            >
              <ChevronsRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Zoom & Viewport Controls */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center space-x-0.5 bg-slate-50 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 rounded-md p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
              title="Zoom Out (-15%)"
              aria-label="Zoom Out"
            >
              <ZoomOutIcon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 rounded transition-colors cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
              title="Zoom In (+15%)"
              aria-label="Zoom In"
            >
              <ZoomInIcon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleFitWidth}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors hidden sm:inline-flex cursor-pointer"
              title="Fit to Container Width"
              aria-label="Fit to Width"
            >
              <FitWidthIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Citation Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowOverlays((prev) => !prev)}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              showOverlays
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700'
            }`}
            title="Toggle Citation Bounding Box Highlights"
            aria-label="Toggle Citation Overlays"
          >
            <HighlighterIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Citations</span>
          </button>

          {/* Fullscreen Viewport Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Fullscreen"
          >
            {isFullscreen ? <MinimizeIcon className="w-3.5 h-3.5" /> : <MaximizeIcon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          Comprehensive Text Search & Match Navigation Toolbar
          ========================================================================= */}
      <div className="px-3.5 py-2 bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between text-xs gap-2.5 transition-colors duration-200">
        <div className="flex items-center space-x-2 flex-1 max-w-lg min-w-[240px]">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.shiftKey) {
                    handlePrevMatch();
                  } else {
                    handleNextMatch();
                  }
                }
              }}
              placeholder="Search document text (e.g. CRAG, RRF, tenant, inference)..."
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-md pl-8 pr-16 py-1 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-sans transition-all"
            />
            {/* Clear Button */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                aria-label="Clear Search"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Search Navigation Controls */}
          {allSearchMatches.length > 0 && (
            <div className="flex items-center space-x-1">
              <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-300 px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded whitespace-nowrap">
                {activeMatchIndex + 1} / {allSearchMatches.length}
              </span>
              <button
                type="button"
                onClick={handlePrevMatch}
                className="p-1 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer"
                title="Previous Match (Shift+Enter)"
              >
                <ChevronUpIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMatch}
                className="p-1 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer"
                title="Next Match (Enter)"
              >
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Case Sensitive Toggle */}
          <button
            type="button"
            onClick={() => setIsCaseSensitive((prev) => !prev)}
            className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
              isCaseSensitive
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
            }`}
            title="Toggle Case Sensitivity"
          >
            Aa
          </button>
        </div>

        {/* Citations Grounding Summary Pill */}
        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
          {searchQuery && allSearchMatches.length === 0 && (
            <span className="text-amber-600 dark:text-amber-400">0 matches found</span>
          )}
          <button
            type="button"
            onClick={() => setSidebarMode('citations')}
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {filteredCitations.length} Visual {filteredCitations.length === 1 ? 'Citation' : 'Citations'} Overlaid
            </span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          Main Workstation Body: Thumbnails/Citations Drawer + Canvas Viewport
          ========================================================================= */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Page Thumbnail Sidebar Navigation */}
        {sidebarMode === 'thumbnails' && (
          <aside
            aria-label="Page Thumbnails"
            className="w-44 sm:w-52 bg-slate-50 dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 flex flex-col p-3 overflow-y-auto space-y-3 z-10 transition-colors duration-200"
          >
            <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-200 dark:border-zinc-800">
              <span>Pages ({numPages})</span>
              <button
                type="button"
                onClick={() => setSidebarMode('none')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                ×
              </button>
            </div>

            {Array.from({ length: numPages }, (_, idx) => {
              const pNum = idx + 1;
              const isCurrent = currentPage === pNum;
              const matchesOnPage = allSearchMatches.filter((m) => m.page === pNum).length;
              const citationsOnPage = unifiedCitations.filter((c) => c.page === pNum).length;

              return (
                <div
                  key={pNum}
                  onClick={() => scrollToPage(pNum)}
                  className={`flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="relative overflow-hidden rounded shadow-2xs border border-slate-200 dark:border-zinc-700 bg-white mb-1.5">
                    <canvas
                      ref={(el) => (thumbnailCanvasRefs.current[pNum] = el)}
                      className="block max-w-full"
                    />
                    {matchesOnPage > 0 && (
                      <span className="absolute top-1 right-1 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500 text-white shadow-xs">
                        {matchesOnPage} search
                      </span>
                    )}
                    {citationsOnPage > 0 && (
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-600 text-white shadow-xs">
                        {citationsOnPage} cit.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] font-mono">
                    <span className={isCurrent ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-zinc-400'}>
                      Page {pNum}
                    </span>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                    )}
                  </div>
                </div>
              );
            })}
          </aside>
        )}

        {/* Visual Citations Grounding Inspector Drawer */}
        {sidebarMode === 'citations' && (
          <aside
            aria-label="Grounded Visual Citations"
            className="w-72 sm:w-80 bg-slate-50 dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 flex flex-col p-3 overflow-y-auto space-y-3 z-10 transition-colors duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-zinc-100">
                <BookmarkIcon className="w-4 h-4 text-blue-600" />
                <span>Visual Citation Inspector</span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarMode('none')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer font-bold text-sm"
              >
                ×
              </button>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center space-x-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setCitationFilter('all')}
                className={`px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                  citationFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 font-bold'
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                }`}
              >
                All ({unifiedCitations.length})
              </button>
              <button
                type="button"
                onClick={() => setCitationFilter('verified')}
                className={`px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                  citationFilter === 'verified'
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                }`}
              >
                Verified (≥90%)
              </button>
              <button
                type="button"
                onClick={() => setCitationFilter('review')}
                className={`px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                  citationFilter === 'review'
                    ? 'bg-amber-600 text-white border-amber-600 font-bold'
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                }`}
              >
                Review (&lt;90%)
              </button>
            </div>

            {/* Citation Cards List */}
            <div className="space-y-2 flex-1">
              {filteredCitations.map((c) => {
                const tier = getConfidenceTier(c.score);
                const isSelected = activeCitation && activeCitation.id === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveCitation(c);
                      scrollToTargetCoordinate(c.page, c.y);
                      onSelectCitation?.(c);
                    }}
                    className={`p-2.5 rounded-lg border text-xs transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-zinc-100 flex items-center space-x-1">
                        <HighlighterIcon className="w-3 h-3 text-blue-600" />
                        <span>{c.label}</span>
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${tier.badgeClass}`}>
                        {tier.badgeText}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      "{c.snippet}"
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800/80 text-[10px] font-mono text-slate-400">
                      <span>Page {c.page}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Click to Ground →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Multi-Page Canvas Scrollable Viewport */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col items-center bg-slate-100 dark:bg-black scroll-smooth relative transition-colors duration-200"
        >
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-20 text-xs font-mono text-slate-700 dark:text-zinc-200">
              <div className="flex items-center space-x-2 p-3 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-md">
                <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span>Asynchronously decoding PDF document streams via PDF.js worker...</span>
              </div>
            </div>
          )}

          {/* Error Notification */}
          {loadingError && (
            <div className="w-full max-w-md p-3 mb-2 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-mono">
              {loadingError} (Showing synthetic preview)
            </div>
          )}

          {/* Multi-Page Canvas Rendering Loop */}
          {Array.from({ length: numPages }, (_, index) => {
            const pageNumber = index + 1;
            const pageCitations = unifiedCitations.filter((item) => item.page === pageNumber);
            const pageSearchMatches = allSearchMatches.filter((item) => item.page === pageNumber);

            return (
              <div
                key={pageNumber}
                id={`pdf-page-${pageNumber}`}
                ref={(el) => (pageRefs.current[pageNumber] = el)}
                data-page-number={pageNumber}
                className="relative bg-white dark:bg-zinc-900 shadow-sm dark:shadow-md rounded-xs border border-slate-200 dark:border-zinc-800 overflow-hidden transition-all duration-150"
              >
                {/* Primary High-DPI HTML5 Canvas for PDF Page Rasterization */}
                <canvas
                  ref={(el) => (canvasRefs.current[pageNumber] = el)}
                  className="block max-w-full bg-white"
                />

                {/* Text Search Matches Overlay Layer */}
                {pageSearchMatches.map((match) => {
                  const isCurrentActive =
                    allSearchMatches[activeMatchIndex] &&
                    allSearchMatches[activeMatchIndex].id === match.id;

                  return (
                    <div
                      key={match.id}
                      style={{
                        left: `${match.x}%`,
                        top: `${match.y}%`,
                        width: `${match.width}%`,
                        height: `${match.height}%`,
                      }}
                      className={`absolute pointer-events-none rounded-xs transition-all duration-150 ${
                        isCurrentActive
                          ? 'bg-amber-400/40 border-2 border-amber-500 ring-4 ring-amber-400/30 animate-pulse z-10 shadow-sm'
                          : 'bg-yellow-300/25 border border-yellow-400/50'
                      }`}
                      title={`Match: "${match.snippet}"`}
                    />
                  );
                })}

                {/* Citation Bounding Box Overlay Layer with Confidence Tiers */}
                {showOverlays && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    aria-label={`Page ${pageNumber} Citation Overlays`}
                  >
                    {pageCitations.map((bbox) => {
                      const tier = getConfidenceTier(bbox.score);
                      const isSelected =
                        (activeCitation && activeCitation.id === bbox.id) ||
                        (selectedCitation && selectedCitation.id === bbox.id) ||
                        (selectedCitation &&
                          selectedCitation.page === bbox.page &&
                          selectedCitation.snippet &&
                          (bbox.snippet.includes(selectedCitation.snippet.slice(0, 20)) ||
                            selectedCitation.snippet.includes(bbox.snippet.slice(0, 20))));

                      return (
                        <div
                          key={bbox.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCitation(bbox);
                            onSelectCitation?.(bbox);
                          }}
                          style={{
                            left: `${bbox.x}%`,
                            top: `${bbox.y}%`,
                            width: `${bbox.width}%`,
                            height: `${bbox.height}%`,
                          }}
                          className={`absolute pointer-events-auto cursor-pointer rounded-xs transition-all duration-150 ${
                            isSelected
                              ? `${tier.activeBgClass} border-2 ${tier.borderClass} ring-4 ${tier.ringClass} shadow-md z-20 animate-pulse`
                              : `${tier.bgFillClass} border ${tier.borderClass} hover:opacity-90 hover:scale-[1.01]`
                          }`}
                          title={`${bbox.label}: ${bbox.snippet} (Confidence: ${Math.round(
                            bbox.score * 100
                          )}%)`}
                        >
                          {/* Interactive Citation Tag Badge */}
                          <div
                            className={`absolute -top-3.5 left-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shadow-xs border border-white/20 ${tier.badgeClass}`}
                          >
                            {bbox.label} [{Math.round(bbox.score * 100)}%]
                          </div>

                          {/* Expanded Interactive Grounding Tooltip Popover on Selection */}
                          {isSelected && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-full left-0 mt-2 z-30 w-72 sm:w-80 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-xl text-slate-800 dark:text-zinc-100 text-xs space-y-2 pointer-events-auto"
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1.5">
                                <div className="flex items-center space-x-1.5 font-bold">
                                  <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{bbox.label}</span>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${tier.badgeClass}`}>
                                  {tier.badgeText}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-600 dark:text-zinc-300 font-sans leading-relaxed">
                                "{bbox.snippet}"
                              </p>

                              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                                <span>Doc: {bbox.document_id || documentTitle}</span>
                                <span>Page {bbox.page}</span>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800">
                                <button
                                  type="button"
                                  onClick={() => handleCopySnippet(bbox)}
                                  className="inline-flex items-center space-x-1 text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                >
                                  {copiedSnippetId === bbox.id ? (
                                    <>
                                      <CheckIcon className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-600">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <CopyIcon className="w-3 h-3" />
                                      <span>Copy Snippet</span>
                                    </>
                                  )}
                                </button>

                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => onSelectCitation?.(bbox)}
                                    className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-mono text-[10px] font-semibold cursor-pointer"
                                  >
                                    Focus in Chat
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveCitation(null)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs cursor-pointer font-bold"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          Viewer Footer Telemetry
          ========================================================================= */}
      <footer className="px-3.5 py-1.5 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-500 dark:text-zinc-400 flex flex-wrap justify-between items-center gap-2 select-none transition-colors duration-200">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Rasterizer: PDF.js Canvas / High-DPI {window.devicePixelRatio || 1}x</span>
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Grounding Citations: {unifiedCitations.length} Active</span>
          {allSearchMatches.length > 0 && (
            <>
              <span className="hidden md:inline">|</span>
              <span className="hidden md:inline text-amber-600 dark:text-amber-400 font-semibold">
                Search Matches: {allSearchMatches.length}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span>Scale: {Math.round(scale * 100)}%</span>
          <span>•</span>
          <span>
            Page {currentPage} of {numPages}
          </span>
        </div>
      </footer>
    </div>
  );
}

// Backward compatibility exports
export { PDFViewerComponent as PDFViewer };
export default PDFViewerComponent;
