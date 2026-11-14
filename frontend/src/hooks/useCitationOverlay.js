import { useState, useMemo, useCallback } from 'react';
import { parseCitationMetadata, getConfidenceTier } from '../utils/coordinateTransform';

/**
 * Custom Hook for Semantic Citation Overlays Management & Filtering
 *
 * Ingests source citation metadata returned by RAG API:
 * - `page_number`: 1-indexed document page
 * - `bounding_box`: [x1, y1, x2, y2]
 * - `confidence_score`: float in [0, 1]
 *
 * Normalizes all representations and provides:
 * - Unified citations pool (combining presets, live conversation citations, and selected citation)
 * - Page-indexed citation partitioning (`citationsByPage`)
 * - Confidence tier filtering ('all' | 'verified' | 'review')
 * - Selected citation and active citation tracking
 *
 * @param {Object} [options]
 * @param {Array} [options.defaultBoundingBoxes=[]] - Baseline preset citations.
 * @param {Array} [options.citations=[]] - Citations extracted from active RAG conversation messages.
 * @param {Object} [options.selectedCitation=null] - Currently focused citation from parent pane.
 * @param {string} [options.documentTitle=''] - Active document title for attribution.
 */
export function useCitationOverlay({
  defaultBoundingBoxes = [],
  citations = [],
  selectedCitation = null,
  documentTitle = '',
} = {}) {
  const [activeCitation, setActiveCitation] = useState(null);
  const [citationFilter, setCitationFilter] = useState('all'); // 'all' | 'verified' | 'review'
  const [showOverlays, setShowOverlays] = useState(true);

  /**
   * Unified and normalized citations list.
   * Merges defaults, live conversation citations, and explicitly selected citation.
   */
  const unifiedCitations = useMemo(() => {
    const pool = [];
    const seenMap = new Map();

    const addCitation = (rawItem, idx) => {
      if (!rawItem) return;
      const parsed = parseCitationMetadata(rawItem, idx, documentTitle);
      if (!parsed) return;

      const dedupeKey = `${parsed.page}-${parsed.snippet.slice(0, 24)}`;
      if (!seenMap.has(dedupeKey)) {
        seenMap.set(dedupeKey, true);
        pool.push(parsed);
      }
    };

    // 1. Add preset bounding boxes
    if (Array.isArray(defaultBoundingBoxes)) {
      defaultBoundingBoxes.forEach((item, idx) => addCitation(item, idx));
    }

    // 2. Add conversation citations from RAG API responses
    if (Array.isArray(citations)) {
      citations.forEach((item, idx) => addCitation(item, pool.length + idx));
    }

    // 3. Ensure selectedCitation is represented if provided
    if (selectedCitation && (selectedCitation.page || selectedCitation.page_number)) {
      const parsedSelected = parseCitationMetadata(selectedCitation, pool.length, documentTitle);
      const exists = pool.some(
        (b) =>
          b.id === parsedSelected.id ||
          (b.page === parsedSelected.page &&
            b.snippet &&
            parsedSelected.snippet &&
            (b.snippet.includes(parsedSelected.snippet.slice(0, 20)) ||
              parsedSelected.snippet.includes(b.snippet.slice(0, 20))))
      );

      if (!exists) {
        pool.push(parsedSelected);
      }
    }

    return pool;
  }, [defaultBoundingBoxes, citations, selectedCitation, documentTitle]);

  /**
   * Citations filtered by user confidence preference or search query.
   */
  const filteredCitations = useMemo(() => {
    return unifiedCitations.filter((item) => {
      if (citationFilter === 'verified' && item.score < 0.90) return false;
      if (citationFilter === 'review' && item.score >= 0.90) return false;
      return true;
    });
  }, [unifiedCitations, citationFilter]);

  /**
   * Map of citations grouped by 1-indexed page number.
   */
  const citationsByPage = useMemo(() => {
    const map = {};
    filteredCitations.forEach((item) => {
      if (!map[item.page]) {
        map[item.page] = [];
      }
      map[item.page].push(item);
    });
    return map;
  }, [filteredCitations]);

  /**
   * Toggles visibility of semantic overlays on the canvas.
   */
  const toggleOverlays = useCallback(() => {
    setShowOverlays((prev) => !prev);
  }, []);

  return {
    unifiedCitations,
    filteredCitations,
    citationsByPage,
    activeCitation,
    setActiveCitation,
    citationFilter,
    setCitationFilter,
    showOverlays,
    setShowOverlays,
    toggleOverlays,
    getConfidenceTier,
  };
}

export default useCitationOverlay;

