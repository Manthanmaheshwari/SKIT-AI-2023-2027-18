import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  parseCitationMetadata,
  renderBoundingBoxOnCanvas,
  getConfidenceTier,
} from '../../utils/coordinateTransform';
import { ShieldCheckIcon, CopyIcon, CheckIcon, BookmarkIcon } from '../common/Icons';

/**
 * Canvas Bounding-Box Overlay Component for PDF.js Split-View Viewer
 *
 * Renders glowing, semi-transparent highlight bounding boxes directly over cited
 * text paragraphs on the PDF.js canvas layer.
 *
 * Dual-Rendering Architecture:
 * 1. High-DPI HTML5 Canvas Layer: Directly draws glowing semi-transparent vector rectangles
 *    with soft shadow blurs and border strokes onto an overlay canvas.
 * 2. Interactive DOM/SVG Grounding Layer: Provides pointer events, pulse animations,
 *    floating badge chips, hover tooltips, and interactive popover cards.
 *
 * Consumes source citation metadata returned by RAG API:
 * - `page_number`: 1-indexed document page
 * - `bounding_box`: [x1, y1, x2, y2]
 * - `confidence_score`: float in range [0, 1]
 */
export function CanvasBoundingBoxOverlay({
  pageNumber,
  citations = [],
  selectedCitation = null,
  onSelectCitation,
  scale = 1.15,
  canvasWidth,
  canvasHeight,
  renderCanvasLayer = true,
  showBadges = true,
  interactive = true,
  className = '',
}) {
  const overlayCanvasRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

  // Normalize citations for this specific page
  const pageCitations = useMemo(() => {
    if (!Array.isArray(citations)) return [];

    return citations
      .map((c, idx) => parseCitationMetadata(c, idx))
      .filter((c) => c && c.page === pageNumber);
  }, [citations, pageNumber]);

  // Determine if a citation matches the active selected citation
  const isCitationSelected = (bbox) => {
    if (!selectedCitation) return false;
    if (selectedCitation.id && bbox.id === selectedCitation.id) return true;
    if (
      (selectedCitation.page === bbox.page || selectedCitation.page_number === bbox.page) &&
      selectedCitation.snippet &&
      bbox.snippet &&
      (bbox.snippet.includes(selectedCitation.snippet.slice(0, 20)) ||
        selectedCitation.snippet.includes(bbox.snippet.slice(0, 20)))
    ) {
      return true;
    }
    return false;
  };

  /**
   * Direct Canvas 2D Drawing:
   * Renders glowing semi-transparent bounding boxes onto the high-DPI overlay canvas.
   */
  useEffect(() => {
    if (!renderCanvasLayer || !overlayCanvasRef.current) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvasWidth || canvas.clientWidth || 680 * scale;
    const height = canvasHeight || canvas.clientHeight || 940 * scale;

    // Synchronize buffer dimensions with display dimensions scaled by DPR
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${Math.floor(width)}px`;
    canvas.style.height = `${Math.floor(height)}px`;

    // Clear previous drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render each citation bounding box onto canvas
    pageCitations.forEach((bbox) => {
      const selected = isCitationSelected(bbox);
      renderBoundingBoxOnCanvas(ctx, bbox, {
        isSelected: selected,
        score: bbox.score,
        viewportWidth: canvas.width,
        viewportHeight: canvas.height,
        dpr: dpr,
        cornerRadius: 4,
      });
    });
  }, [pageCitations, selectedCitation, scale, canvasWidth, canvasHeight, renderCanvasLayer]);

  // Handle snippet clipboard copy with feedback
  const handleCopySnippet = (e, snippet, id) => {
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(snippet);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (pageCitations.length === 0) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-visible select-none z-10 ${className}`}
      aria-label={`Page ${pageNumber} Semantic Grounding Overlays`}
    >
      {/* 1. High-DPI HTML5 Overlay Canvas for Direct Glowing Box Rasterization */}
      {renderCanvasLayer && (
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 pointer-events-none block"
          style={{ width: '100%', height: '100%' }}
        />
      )}

      {/* 2. Interactive DOM Overlay Layer with Badges, Pulse Rings & Popovers */}
      {interactive && (
        <div className="absolute inset-0 pointer-events-none">
          {pageCitations.map((bbox) => {
            const isSelected = isCitationSelected(bbox);
            const tier = bbox.tierInfo || getConfidenceTier(bbox.score);

            return (
              <div
                key={bbox.id}
                role="button"
                tabIndex={0}
                aria-label={`${bbox.label}: ${bbox.snippet} (Confidence: ${tier.percentage}%)`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCitation?.(bbox);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectCitation?.(bbox);
                  }
                }}
                style={{
                  left: `${bbox.x}%`,
                  top: `${bbox.y}%`,
                  width: `${bbox.width}%`,
                  height: `${bbox.height}%`,
                  boxShadow: isSelected ? tier.shadowStyle : '0 0 8px rgba(0,0,0,0.05)',
                }}
                className={`absolute pointer-events-auto cursor-pointer rounded-xs transition-all duration-200 outline-none ${
                  isSelected
                    ? `${tier.activeBgClass} border-2 ${tier.borderClass} ring-4 ${tier.ringClass} shadow-xl z-20 animate-pulse`
                    : `${tier.bgFillClass} border ${tier.borderClass} hover:opacity-95 hover:scale-[1.008] hover:ring-2 hover:${tier.ringClass}`
                }`}
                title={`${bbox.label}: ${bbox.snippet} (Confidence: ${tier.percentage}%)`}
              >
                {/* Floating Citation Tag Badge */}
                {showBadges && (
                  <div
                    className={`absolute -top-3.5 left-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shadow-xs border border-white/20 flex items-center space-x-1 ${tier.badgeClass}`}
                  >
                    <span>{bbox.label}</span>
                    <span>[{tier.percentage}%]</span>
                  </div>
                )}

                {/* Expanded Interactive Grounding Tooltip Popover on Selection */}
                {isSelected && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 mt-2 z-30 w-72 sm:w-84 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-2xl text-slate-800 dark:text-zinc-100 text-xs space-y-2.5 pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1.5">
                      <div className="flex items-center space-x-1.5 font-bold text-slate-900 dark:text-zinc-100">
                        <ShieldCheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="truncate max-w-[150px]">{bbox.label}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${tier.badgeClass}`}>
                        {tier.badgeText}
                      </span>
                    </div>

                    {/* Grounding Snippet */}
                    <div className="bg-slate-50 dark:bg-zinc-950/70 p-2 rounded border border-slate-100 dark:border-zinc-800/80 font-sans text-[11px] leading-relaxed text-slate-700 dark:text-zinc-300 italic">
                      "{bbox.snippet}"
                    </div>

                    {/* Metadata Footer & Copy Action */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                      <div className="flex items-center space-x-1 truncate max-w-[160px]">
                        <BookmarkIcon className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{bbox.document_id}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleCopySnippet(e, bbox.snippet, bbox.id)}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-sans text-[10px] transition-colors cursor-pointer"
                        title="Copy cited snippet"
                      >
                        {copiedId === bbox.id ? (
                          <>
                            <CheckIcon className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <CopyIcon className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
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
}

export default CanvasBoundingBoxOverlay;

