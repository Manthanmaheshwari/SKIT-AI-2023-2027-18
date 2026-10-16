import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
  FitWidthIcon,
  UploadIcon,
  DocumentIcon,
  HighlighterIcon,
  CloseIcon,
} from '../common/Icons';

/**
 * Configure PDF.js Worker.
 * Offloads CPU-intensive operations (binary parsing, font decompression,
 * xref table traversal, and stream decoding) away from the main UI thread.
 */
if (typeof window !== 'undefined') {
  try {
    if (pdfjsLib?.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${
        pdfjsLib.version || '4.6.82'
      }/pdf.worker.min.mjs`;
    }
  } catch (err) {
    // Handled gracefully in render pipeline
  }
}

/**
 * Bounding Box Annotation Interface.
 * @typedef {Object} SearchBoundingBox
 * @property {string} id - Unique identifier for the search result / citation.
 * @property {number} page - 1-indexed target page number.
 * @property {number} x - Left coordinate expressed as percentage (0-100).
 * @property {number} y - Top coordinate expressed as percentage (0-100).
 * @property {number} width - Width dimension expressed as percentage (0-100).
 * @property {number} height - Height dimension expressed as percentage (0-100).
 * @property {string} label - Citation or search term label.
 * @property {string} snippet - Extracted text snippet.
 * @property {number} score - Confidence or relevance metric (0.00 - 1.00).
 */

/**
 * Enterprise verified citation annotations for multi-tenant RAG document grounding.
 * @type {SearchBoundingBox[]}
 */
const DEFAULT_BOUNDING_BOXES = [
  {
    id: 'bbox-001',
    page: 1,
    x: 8,
    y: 20,
    width: 84,
    height: 7.5,
    label: 'Citation #1 (CRAG Logic)',
    snippet: 'Corrective Retrieval-Augmented Generation mitigates hallucinations via iterative verification.',
    score: 0.96,
  },
  {
    id: 'bbox-002',
    page: 1,
    x: 8,
    y: 42,
    width: 84,
    height: 8.5,
    label: 'Citation #2 (Hybrid RRF)',
    snippet: 'Reciprocal Rank Fusion aggregates dense ChromaDB vectors with Rank-BM25 sparse tokens.',
    score: 0.91,
  },
  {
    id: 'bbox-003',
    page: 2,
    x: 8,
    y: 20,
    width: 84,
    height: 7.0,
    label: 'Citation #3 (Tenant Isolation)',
    snippet: 'Global Query Filters guarantee cryptographic and logical database separation per tenant GUID.',
    score: 0.94,
  },
  {
    id: 'bbox-004',
    page: 2,
    x: 8,
    y: 44,
    width: 84,
    height: 7.5,
    label: 'Citation #4 (DeepSeek-R1)',
    snippet: 'Local Ollama runtime hosts DeepSeek-R1 for air-gapped enterprise mathematical inference.',
    score: 0.89,
  },
];

/**
 * PDFViewerComponent
 *
 * Professional, industry-grade enterprise PDF document viewer utilizing HTML5 Canvas and PDF.js.
 * Built with a clean, crisp 'White' base theme for light mode and a deep-black contrast for dark mode,
 * featuring smooth continuous multi-page scrolling, real-time page detection, jump-to-page navigation,
 * zoom controls, file upload capabilities, and interactive semantic citation overlays.
 *
 * @param {Object} props
 * @param {string|null} [props.documentSource=null] - URL or data URI of the PDF document.
 * @param {string} [props.initialTitle='CRAG_Architecture_Whitepaper_2026.pdf'] - Initial document title.
 * @param {(citation: SearchBoundingBox) => void} [props.onSelectCitation] - Callback on citation selection.
 * @param {SearchBoundingBox[]} [props.boundingBoxes=DEFAULT_BOUNDING_BOXES] - Optional custom citations.
 * @returns {JSX.Element}
 */
export function PDFViewerComponent({
  documentSource = null,
  initialTitle = 'CRAG_Architecture_Whitepaper_2026.pdf',
  onSelectCitation,
  boundingBoxes = DEFAULT_BOUNDING_BOXES,
}) {
  const [numPages, setNumPages] = useState(2);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [scale, setScale] = useState(1.15);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [documentTitle, setDocumentTitle] = useState(initialTitle);
  const [showOverlays, setShowOverlays] = useState(true);
  const [activeCitationId, setActiveCitationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Refs for DOM nodes and asynchronous worker execution handles
  const scrollContainerRef = useRef(null);
  const pageRefs = useRef({});
  const canvasRefs = useRef({});
  const activeRenderTasksRef = useRef({});
  const pdfDocumentRef = useRef(null);
  const fileInputRef = useRef(null);

  /**
   * Generates an authentic high-resolution synthetic document representation.
   * Renders crisp stark-white paper with high-contrast typography, mathematical formulas,
   * and structural demarcations as an immediate high-DPI canvas fallback.
   */
  const renderFallbackPageToCanvas = useCallback((canvas, pageNum, currentScale) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseWidth = 680;
    const baseHeight = 940;
    const dpr = window.devicePixelRatio || 1;

    // Retina-sharp internal canvas resolution
    canvas.width = Math.floor(baseWidth * currentScale * dpr);
    canvas.height = Math.floor(baseHeight * currentScale * dpr);

    // Explicit CSS display dimensions
    canvas.style.width = `${Math.floor(baseWidth * currentScale)}px`;
    canvas.style.height = `${Math.floor(baseHeight * currentScale)}px`;

    ctx.save();
    ctx.scale(dpr * currentScale, dpr * currentScale);

    // Stark crisp white paper sheet
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    // Paper outer border rule
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, baseWidth - 2, baseHeight - 2);

    // Header metadata rule
    ctx.fillStyle = '#475569'; // slate-600
    ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText('ENTERPRISE AI RESEARCH PLATFORM — SPECIFICATION DRAFT', 44, 48);
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.fillText(`PAGE ${String(pageNum).padStart(2, '0')} / 02`, baseWidth - 140, 48);

    ctx.strokeStyle = '#cbd5e1'; // slate-300
    ctx.beginPath();
    ctx.moveTo(44, 60);
    ctx.lineTo(baseWidth - 44, 60);
    ctx.stroke();

    // Body content by page index
    if (pageNum === 1) {
      // Primary Title
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Corrective Retrieval-Augmented Generation (CRAG)', 44, 98);

      ctx.fillStyle = '#2563eb'; // blue-600
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Section 1.1: Asynchronous Knowledge Ingestion & LangGraph Evaluators', 44, 122);

      // Paragraph 1
      ctx.fillStyle = '#334155'; // slate-700
      ctx.font = '12px/18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Large language models frequently encounter hallucinations when queried on private enterprise', 44, 150);
      ctx.fillText('corpora. The CRAG framework introduces a deterministic state machine evaluator that dynamically', 44, 170);
      ctx.fillText('scores retrieved candidate context chunks prior to final inference synthesis.', 44, 190);

      // Section 2
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Section 1.2: Hybrid Reciprocal Rank Fusion (RRF)', 44, 238);

      ctx.fillStyle = '#334155';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Retrieval precision is optimized by merging dense vector similarities (ChromaDB) with', 44, 264);
      ctx.fillText('sparse BM25 lexical keyword indices. Candidate chunks are re-ranked according to:', 44, 284);

      // Mathematical Formula Card
      ctx.fillStyle = '#f8fafc'; // slate-50
      ctx.fillRect(44, 306, baseWidth - 88, 54);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(44, 306, baseWidth - 88, 54);

      ctx.fillStyle = '#1d4ed8'; // blue-700
      ctx.font = '600 12px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText('RRF_Score(d ∈ D) = ∑_{m ∈ M} [ 1 / ( k + rank_m(d) ) ]', 64, 338);

      // Paragraph 2
      ctx.fillStyle = '#334155';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('When LangGraph evaluator confidence falls below the 0.82 threshold, fallback query', 44, 390);
      ctx.fillText('rewriting is automatically dispatched across RabbitMQ asynchronous message queues.', 44, 410);

      // Research Metadata Table Box
      ctx.fillStyle = '#f1f5f9'; // slate-100
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
    } else {
      // Page 2
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
      ctx.fillStyle = '#eff6ff'; // blue-50
      ctx.fillRect(44, 314, baseWidth - 88, 62);
      ctx.strokeStyle = '#bfdbfe'; // blue-200
      ctx.strokeRect(44, 314, baseWidth - 88, 62);

      ctx.fillStyle = '#1e40af'; // blue-800
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Security Enforcement Architecture:', 56, 336);
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('All vector embeddings stored in ChromaDB are partitioned with tenant-scoped metadata predicates.', 56, 356);
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
   * Asynchronously renders a single PDF.js page onto a target canvas element.
   * Thread isolation cleanly cancels any in-flight render stream on the same canvas.
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

      // If no live PDF.js document handle exists, render the high-DPI synthetic fallback
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
          // Fall back gracefully to high-DPI canvas
          renderFallbackPageToCanvas(canvas, pageNumber, scale);
        }
      }
    },
    [scale, renderFallbackPageToCanvas]
  );

  /**
   * Loads document from URI or initializes standard fallback research document.
   */
  const loadDocument = useCallback(async () => {
    setIsLoading(true);
    setLoadingError(null);

    try {
      if (documentSource && typeof documentSource === 'string') {
        const loadingTask = pdfjsLib.getDocument({
          url: documentSource,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        pdfDocumentRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInputValue('1');
      } else {
        pdfDocumentRef.current = null;
        setNumPages(2);
      }
    } catch (err) {
      setLoadingError(err.message || 'Failed to load PDF file.');
      pdfDocumentRef.current = null;
      setNumPages(2);
    } finally {
      setIsLoading(false);
    }
  }, [documentSource]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Re-render visible canvases on page count or zoom scale update
  useEffect(() => {
    for (let p = 1; p <= numPages; p++) {
      renderPage(p);
    }

    return () => {
      Object.keys(activeRenderTasksRef.current).forEach((pageKey) => {
        try {
          activeRenderTasksRef.current[pageKey]?.cancel();
        } catch (e) {
          // Safe ignore
        }
      });
      activeRenderTasksRef.current = {};
    };
  }, [numPages, scale, renderPage]);

  /**
   * Continuous scroll tracking to detect current page in viewport.
   */
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const containerTop = scrollContainerRef.current.scrollTop;

    for (let p = 1; p <= numPages; p++) {
      const pageEl = pageRefs.current[p];
      if (pageEl) {
        const offsetTop = pageEl.offsetTop - scrollContainerRef.current.offsetTop;
        if (offsetTop + pageEl.clientHeight / 3 >= containerTop) {
          setCurrentPage(p);
          setPageInputValue(String(p));
          break;
        }
      }
    }
  };

  /**
   * Explicit Navigation: Smoothly scrolls to target page index.
   */
  const scrollToPage = (targetPage) => {
    const clampedPage = Math.max(1, Math.min(targetPage, numPages));
    setCurrentPage(clampedPage);
    setPageInputValue(String(clampedPage));

    const targetEl = pageRefs.current[clampedPage];
    if (targetEl && scrollContainerRef.current) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
   * Local file upload handler.
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
      } catch (err) {
        setLoadingError('Failed to parse uploaded PDF.');
        pdfDocumentRef.current = null;
        setNumPages(2);
        setIsLoading(false);
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  // Zoom controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.15, 0.5));
  const handleFitWidth = () => setScale(1.15);
  const handleResetZoom = () => setScale(1.0);

  // Filter citations by search query
  const filteredCitations = boundingBoxes.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.snippet.toLowerCase().includes(q) ||
      String(item.page).includes(q)
    );
  });

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm transition-colors duration-200">
      {/* =========================================================================
          Primary Enterprise Header Toolbar
          ========================================================================= */}
      <header className="px-3.5 py-2.5 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs select-none transition-colors duration-200">
        {/* Document Identifier & Upload */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-zinc-700 flex-shrink-0">
            <DocumentIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="font-medium text-slate-800 dark:text-zinc-100 truncate max-w-[140px] sm:max-w-[220px] lg:max-w-[280px]"
              title={documentTitle}
            >
              {documentTitle}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              PDF.js Engine • {numPages} {numPages === 1 ? 'Page' : 'Pages'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors shadow-2xs"
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
          <div className="flex items-center space-x-1 bg-slate-50 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => scrollToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
              title="Previous Page"
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

            <button
              type="button"
              onClick={() => scrollToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Zoom & View Options */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center space-x-0.5 bg-slate-50 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 rounded-md p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              title="Zoom Out (-15%)"
              aria-label="Zoom Out"
            >
              <ZoomOutIcon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 rounded transition-colors"
              title="Reset Zoom to 100%"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              title="Zoom In (+15%)"
              aria-label="Zoom In"
            >
              <ZoomInIcon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleFitWidth}
              className="p-1 rounded text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors hidden sm:inline-flex"
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
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              showOverlays
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700'
            }`}
            title="Toggle Citation Bounding Box Highlights"
            aria-label="Toggle Citation Overlays"
          >
            <HighlighterIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Citations</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          Secondary Search & Verification Toolbar
          ========================================================================= */}
      <div className="px-3.5 py-2 bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs gap-3 transition-colors duration-200">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter verified citations in document..."
            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-md pl-8 pr-7 py-1 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-sans transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              aria-label="Clear Search"
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
          <span>
            {filteredCitations.length} {filteredCitations.length === 1 ? 'Citation' : 'Citations'} Active
          </span>
        </div>
      </div>

      {/* =========================================================================
          Multi-Page Canvas Scrollable Viewport
          ========================================================================= */}
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
              <span>Asynchronously decoding PDF document streams...</span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {loadingError && (
          <div className="w-full max-w-md p-3 mb-2 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-mono">
            {loadingError} (Showing synthetic preview)
          </div>
        )}

        {/* Multi-Page Canvas Loop */}
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1;
          const pageCitations = filteredCitations.filter((item) => item.page === pageNumber);

          return (
            <div
              key={pageNumber}
              ref={(el) => (pageRefs.current[pageNumber] = el)}
              className="relative bg-white dark:bg-zinc-900 shadow-sm dark:shadow-md rounded-sm border border-slate-200 dark:border-zinc-800 overflow-hidden transition-all duration-150"
            >
              {/* Primary High-DPI HTML5 Canvas for PDF Page Rasterization */}
              <canvas
                ref={(el) => (canvasRefs.current[pageNumber] = el)}
                className="block max-w-full bg-white"
              />

              {/* Text Search & Citation Bounding Box Overlay Layer */}
              {showOverlays && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  aria-label={`Page ${pageNumber} Citation Overlays`}
                >
                  {pageCitations.map((bbox) => {
                    const isActive = activeCitationId === bbox.id;

                    return (
                      <div
                        key={bbox.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCitationId(bbox.id);
                          onSelectCitation?.(bbox);
                        }}
                        style={{
                          left: `${bbox.x}%`,
                          top: `${bbox.y}%`,
                          width: `${bbox.width}%`,
                          height: `${bbox.height}%`,
                        }}
                        className={`absolute pointer-events-auto cursor-pointer rounded-sm transition-all duration-150 ${
                          isActive
                            ? 'bg-blue-600/25 border-2 border-blue-600 ring-2 ring-blue-500/40 shadow-xs'
                            : 'bg-blue-500/10 border border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-600'
                        }`}
                        title={`${bbox.label}: ${bbox.snippet} (Confidence: ${Math.round(bbox.score * 100)}%)`}
                      >
                        {/* Interactive Citation Tag */}
                        <div className="absolute -top-3.5 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border border-slate-700 dark:border-zinc-300 shadow-xs">
                          {bbox.label} [{Math.round(bbox.score * 100)}%]
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          Viewer Footer Telemetry
          ========================================================================= */}
      <footer className="px-3.5 py-1.5 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-500 dark:text-zinc-400 flex flex-wrap justify-between items-center gap-2 select-none transition-colors duration-200">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Rasterizer: HTML5 Canvas / PDF.js Worker</span>
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">High-DPI Retina: {window.devicePixelRatio || 1}x</span>
        </div>

        <div className="flex items-center space-x-2">
          <span>Viewport Scale: {Math.round(scale * 100)}%</span>
          <span>•</span>
          <span>Page {currentPage} of {numPages}</span>
        </div>
      </footer>
    </div>
  );
}

// Backward compatibility alias
export { PDFViewerComponent as PDFViewer };
export default PDFViewerComponent;
