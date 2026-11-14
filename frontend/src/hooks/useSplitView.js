import { useState, useCallback, useMemo } from 'react';

/**
 * Custom Hook for PDF.js Split-View Workstation Management & Cross-Pane Synchronization
 *
 * Coordinates the rigid split-view workstation layout modes:
 * - 'balanced': 50/50 dual research & QA workstation (default)
 * - 'wide-pdf': 66.7% / 33.3% deep document grounding & inspection
 * - 'wide-chat': 41.7% / 58.3% complex dialogue & prompt engineering
 * - 'full-pdf': 100% distraction-free document reading & presentation
 * - 'full-chat': 100% full conversation & multi-tenant logs
 *
 * Manages bidirectional cross-pane citation synchronization:
 * - Selecting citation chip in chat activates bounding-box highlight & auto-scroll in PDF pane
 * - Clicking on-canvas bounding box updates selectedCitation and active grounding ribbon
 *
 * @param {Object} [options]
 * @param {string} [options.initialLayout='balanced'] - Initial split layout mode.
 * @param {Object} [options.initialSelectedCitation=null] - Initial active citation.
 * @param {Function} [options.onLayoutChange] - Callback on layout switch.
 */
export function useSplitView({
  initialLayout = 'balanced',
  initialSelectedCitation = null,
  onLayoutChange,
} = {}) {
  const [splitLayout, setSplitLayoutState] = useState(initialLayout);
  const [selectedCitation, setSelectedCitation] = useState(initialSelectedCitation);
  const [activeCitationId, setActiveCitationId] = useState(initialSelectedCitation?.id || null);

  /**
   * Sets split layout mode with validation and callback.
   */
  const setSplitLayout = useCallback(
    (newLayout) => {
      const validLayouts = ['balanced', 'wide-pdf', 'wide-chat', 'full-pdf', 'full-chat'];
      if (validLayouts.includes(newLayout)) {
        setSplitLayoutState(newLayout);
        onLayoutChange?.(newLayout);
      }
    },
    [onLayoutChange]
  );

  /**
   * Cycles to the next logical split layout mode.
   */
  const cycleSplitLayout = useCallback(() => {
    const cycleOrder = ['balanced', 'wide-pdf', 'wide-chat', 'full-pdf', 'full-chat'];
    setSplitLayoutState((prev) => {
      const nextIdx = (cycleOrder.indexOf(prev) + 1) % cycleOrder.length;
      const next = cycleOrder[nextIdx];
      onLayoutChange?.(next);
      return next;
    });
  }, [onLayoutChange]);

  /**
   * Selects a citation across both panes (document canvas and AI chat).
   */
  const handleSelectCitation = useCallback((citation) => {
    if (!citation) {
      setSelectedCitation(null);
      setActiveCitationId(null);
      return;
    }

    setSelectedCitation(citation);
    setActiveCitationId(citation.id || null);
  }, []);

  /**
   * Clears currently active citation selection.
   */
  const clearSelectedCitation = useCallback(() => {
    setSelectedCitation(null);
    setActiveCitationId(null);
  }, []);

  /**
   * Evaluates visibility states.
   */
  const isPDFVisible = splitLayout !== 'full-chat';
  const isChatVisible = splitLayout !== 'full-pdf';

  /**
   * Generates Tailwind CSS classes for the split workstation grid layout.
   */
  const containerGridClass = useMemo(() => {
    switch (splitLayout) {
      case 'balanced':
        return 'grid grid-cols-1 lg:grid-cols-2 gap-4 h-full min-h-0';
      case 'wide-pdf':
      case 'wide-chat':
        return 'grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0';
      case 'full-pdf':
      case 'full-chat':
      default:
        return 'flex flex-col h-full min-h-0';
    }
  }, [splitLayout]);

  /**
   * Generates Tailwind CSS classes for the Left Pane (Document Grounding Viewer).
   */
  const leftPaneClass = useMemo(() => {
    if (!isPDFVisible) return 'hidden';
    switch (splitLayout) {
      case 'balanced':
        return 'h-full min-h-0 flex flex-col overflow-hidden';
      case 'wide-pdf':
        return 'lg:col-span-8 h-full min-h-0 flex flex-col overflow-hidden';
      case 'wide-chat':
        return 'lg:col-span-5 h-full min-h-0 flex flex-col overflow-hidden';
      case 'full-pdf':
        return 'w-full flex-1 h-full min-h-0 flex flex-col overflow-hidden';
      default:
        return 'h-full min-h-0 flex flex-col overflow-hidden';
    }
  }, [splitLayout, isPDFVisible]);

  /**
   * Generates Tailwind CSS classes for the Right Pane (AI Dialogue Interface).
   */
  const rightPaneClass = useMemo(() => {
    if (!isChatVisible) return 'hidden';
    switch (splitLayout) {
      case 'balanced':
        return 'h-full min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs transition-colors duration-200';
      case 'wide-pdf':
        return 'lg:col-span-4 h-full min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs transition-colors duration-200';
      case 'wide-chat':
        return 'lg:col-span-7 h-full min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs transition-colors duration-200';
      case 'full-chat':
        return 'w-full flex-1 h-full min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs transition-colors duration-200';
      default:
        return 'h-full min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs transition-colors duration-200';
    }
  }, [splitLayout, isChatVisible]);

  return {
    splitLayout,
    setSplitLayout,
    cycleSplitLayout,
    selectedCitation,
    setSelectedCitation,
    activeCitationId,
    setActiveCitationId,
    handleSelectCitation,
    clearSelectedCitation,
    isPDFVisible,
    isChatVisible,
    containerGridClass,
    leftPaneClass,
    rightPaneClass,
  };
}

export default useSplitView;

