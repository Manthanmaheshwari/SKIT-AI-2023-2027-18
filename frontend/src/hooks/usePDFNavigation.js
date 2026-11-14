import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom Hook for PDF.js Navigation, Smooth Auto-Scroll, and Scroll-Spy Tracking
 *
 * Provides:
 * - Boundary-checked page navigation (prev, next, first, last, explicit jump)
 * - Controlled page input field with validation
 * - Continuous scroll-spy to identify currently visible page in viewport
 * - Smooth auto-scroll to cited page
 * - Smooth coordinate-calibrated auto-scroll to exact citation bounding boxes
 * - Anti-jitter internal scroll suppression flags
 *
 * @param {Object} options
 * @param {number} [options.initialPage=1] - Starting page number.
 * @param {number} [options.initialNumPages=3] - Total pages count.
 * @param {React.RefObject} options.scrollContainerRef - Reference to scrollable viewport container.
 * @param {React.MutableRefObject<Object>} options.pageRefs - Map of page element DOM nodes.
 * @param {Function} [options.onPageChange] - Optional callback fired when current page changes.
 */
export function usePDFNavigation({
  initialPage = 1,
  initialNumPages = 3,
  scrollContainerRef,
  pageRefs,
  onPageChange,
} = {}) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [numPages, setNumPages] = useState(initialNumPages);
  const [pageInputValue, setPageInputValue] = useState(String(initialPage));
  const [isNavigating, setIsNavigating] = useState(false);

  // Internal flags to prevent scroll-spy fighting programmatic smooth scroll
  const isScrollingInternallyRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Synchronize input string when currentPage changes externally
  useEffect(() => {
    setPageInputValue(String(currentPage));
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  /**
   * Continuous scroll tracking to detect current page in viewport (Scroll-Spy).
   */
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef?.current || isScrollingInternallyRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const containerTop = container.scrollTop;
    const containerCenter = containerTop + container.clientHeight / 3;

    let detectedPage = currentPage;
    let closestDistance = Infinity;

    // Evaluate offset for each rendered page container
    for (let p = 1; p <= numPages; p++) {
      const pageEl = pageRefs?.current?.[p];
      if (pageEl) {
        const pageTop = pageEl.offsetTop;
        const distance = Math.abs(pageTop - containerCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          detectedPage = p;
        }
      }
    }

    if (detectedPage !== currentPage && detectedPage >= 1 && detectedPage <= numPages) {
      setCurrentPage(detectedPage);
    }
  }, [currentPage, numPages, scrollContainerRef, pageRefs]);

  /**
   * Smoothly scrolls to target page index with anti-jitter lock.
   *
   * @param {number} targetPage - Target page index (1-based).
   * @param {Object} [options]
   * @param {ScrollBehavior} [options.behavior='smooth'] - Scroll behavior.
   * @param {ScrollLogicalPosition} [options.block='start'] - Vertical alignment.
   */
  const scrollToPage = useCallback(
    (targetPage, options = {}) => {
      const parsed = Math.max(1, Math.min(Number(targetPage) || 1, numPages));
      setCurrentPage(parsed);
      setPageInputValue(String(parsed));

      const targetEl = pageRefs?.current?.[parsed];
      if (targetEl && scrollContainerRef?.current) {
        isScrollingInternallyRef.current = true;
        setIsNavigating(true);

        targetEl.scrollIntoView({
          behavior: options.behavior || 'smooth',
          block: options.block || 'start',
        });

        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingInternallyRef.current = false;
          setIsNavigating(false);
        }, 600);
      }
    },
    [numPages, pageRefs, scrollContainerRef]
  );

  /**
   * Smooth coordinate-calibrated auto-scroll directly to a cited paragraph bounding box.
   * Aligns the cited paragraph comfortably near the top/center of the viewport.
   *
   * @param {Object} citation - Citation object with `page` and `y` (or `top`).
   * @param {Object} [options]
   * @param {number} [options.viewportOffsetRatio=2.5] - Vertical centering divisor.
   * @param {ScrollBehavior} [options.behavior='smooth'] - Scroll behavior.
   */
  const scrollToCitation = useCallback(
    (citation, options = {}) => {
      if (!citation) return;

      const pageNum = Number(citation.page_number ?? citation.page ?? 1);
      const targetPage = Math.max(1, Math.min(pageNum, numPages));
      setCurrentPage(targetPage);
      setPageInputValue(String(targetPage));

      const pageEl = pageRefs?.current?.[targetPage];
      const container = scrollContainerRef?.current;

      if (!pageEl || !container) {
        scrollToPage(targetPage);
        return;
      }

      // Calculate vertical pixel offset of citation within page
      const pageTop = pageEl.offsetTop;
      const pageHeight = pageEl.clientHeight;
      const yPercent = Number(citation.y ?? citation.top ?? 20.0);
      const citationPixelOffset = (yPercent / 100) * pageHeight;
      const targetPixelY = pageTop + citationPixelOffset;

      isScrollingInternallyRef.current = true;
      setIsNavigating(true);

      const offsetDivisor = options.viewportOffsetRatio || 2.5;
      const targetScrollTop = Math.max(0, targetPixelY - container.clientHeight / offsetDivisor);

      container.scrollTo({
        top: targetScrollTop,
        behavior: options.behavior || 'smooth',
      });

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingInternallyRef.current = false;
        setIsNavigating(false);
      }, 650);
    },
    [numPages, pageRefs, scrollContainerRef, scrollToPage]
  );

  /**
   * Navigation controls: boundary-checked step functions
   */
  const nextPage = useCallback(() => {
    if (currentPage < numPages) {
      scrollToPage(currentPage + 1);
    }
  }, [currentPage, numPages, scrollToPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  }, [currentPage, scrollToPage]);

  const firstPage = useCallback(() => {
    scrollToPage(1);
  }, [scrollToPage]);

  const lastPage = useCallback(() => {
    scrollToPage(numPages);
  }, [numPages, scrollToPage]);

  const handlePageInputChange = useCallback((e) => {
    const val = typeof e === 'object' && e?.target ? e.target.value : String(e);
    setPageInputValue(val);
  }, []);

  const handlePageInputSubmit = useCallback(
    (e) => {
      if (e?.preventDefault) {
        e.preventDefault();
      }
      const parsed = parseInt(pageInputValue, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
        scrollToPage(parsed);
      } else {
        setPageInputValue(String(currentPage));
      }
    },
    [pageInputValue, numPages, currentPage, scrollToPage]
  );

  return {
    currentPage,
    setCurrentPage,
    numPages,
    setNumPages,
    pageInputValue,
    setPageInputValue,
    isNavigating,
    isScrollingInternallyRef,

    // Navigation actions
    scrollToPage,
    scrollToCitation,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    handleScroll,
    handlePageInputChange,
    handlePageInputSubmit,

    // State predicates
    hasNextPage: currentPage < numPages,
    hasPrevPage: currentPage > 1,
  };
}

export default usePDFNavigation;

