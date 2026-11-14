import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DEFAULT_CANVAS_BASE_WIDTH,
  DEFAULT_CANVAS_BASE_HEIGHT,
  recalibrateZoomForContainer,
} from '../utils/coordinateTransform';

/**
 * Custom Hook for Viewport Zoom Management and Automatic Recalibration
 *
 * Provides:
 * - Viewport zoom scale state clamped within [minScale, maxScale]
 * - Zoom In (+15%), Zoom Out (-15%), and Reset Zoom
 * - Automatic "Fit to Width" calculation based on container clientWidth
 * - "Fit to Page" calculation based on container clientHeight
 * - Viewport Zoom Recalibration on container resize (via ResizeObserver)
 * - Split-view pane transition zoom recalibration
 *
 * @param {Object} [options]
 * @param {number} [options.initialScale=1.15] - Initial zoom scale factor.
 * @param {number} [options.minScale=0.50] - Minimum allowable zoom scale factor.
 * @param {number} [options.maxScale=2.50] - Maximum allowable zoom scale factor.
 * @param {number} [options.step=0.15] - Incremental zoom step.
 * @param {React.RefObject} [options.containerRef] - Container element to track for resize recalibration.
 * @param {boolean} [options.autoRecalibrateOnResize=false] - Whether to automatically recalibrate zoom on container resize.
 * @param {number} [options.baseWidth=DEFAULT_CANVAS_BASE_WIDTH] - Standard paper width.
 * @param {number} [options.baseHeight=DEFAULT_CANVAS_BASE_HEIGHT] - Standard paper height.
 */
export function usePDFZoom({
  initialScale = 1.15,
  minScale = 0.50,
  maxScale = 2.50,
  step = 0.15,
  containerRef = null,
  autoRecalibrateOnResize = false,
  baseWidth = DEFAULT_CANVAS_BASE_WIDTH,
  baseHeight = DEFAULT_CANVAS_BASE_HEIGHT,
} = {}) {
  const [scale, setScale] = useState(initialScale);
  const [isFitWidthActive, setIsFitWidthActive] = useState(false);
  const resizeObserverRef = useRef(null);

  /**
   * Clamps and applies a new zoom scale multiplier.
   */
  const setClampedScale = useCallback(
    (newScale) => {
      const parsed = typeof newScale === 'function' ? newScale(scale) : newScale;
      const clamped = Math.max(minScale, Math.min(maxScale, parsed));
      setScale(parseFloat(clamped.toFixed(2)));
    },
    [minScale, maxScale, scale]
  );

  /**
   * Increases zoom scale by step.
   */
  const zoomIn = useCallback(() => {
    setIsFitWidthActive(false);
    setClampedScale((prev) => Math.min(prev + step, maxScale));
  }, [step, maxScale, setClampedScale]);

  /**
   * Decreases zoom scale by step.
   */
  const zoomOut = useCallback(() => {
    setIsFitWidthActive(false);
    setClampedScale((prev) => Math.max(prev - step, minScale));
  }, [step, minScale, setClampedScale]);

  /**
   * Resets zoom scale to default.
   */
  const resetZoom = useCallback(() => {
    setIsFitWidthActive(false);
    setClampedScale(initialScale);
  }, [initialScale, setClampedScale]);

  /**
   * Fits canvas width to available container client width with gutter padding.
   *
   * @param {React.RefObject|HTMLElement} [targetContainer] - Optional explicit container override.
   * @param {number} [padding=80] - Left and right container gutter padding.
   */
  const fitWidth = useCallback(
    (targetContainer = null, padding = 80) => {
      const container = targetContainer?.current || targetContainer || containerRef?.current;
      if (container && container.clientWidth) {
        const optimalScale = recalibrateZoomForContainer(container, baseWidth, padding);
        setScale(optimalScale);
        setIsFitWidthActive(true);
        return optimalScale;
      }
      setScale(1.15);
      return 1.15;
    },
    [containerRef, baseWidth]
  );

  /**
   * Fits canvas height to available container client height.
   *
   * @param {React.RefObject|HTMLElement} [targetContainer] - Optional explicit container override.
   * @param {number} [padding=60] - Top and bottom container padding.
   */
  const fitPage = useCallback(
    (targetContainer = null, padding = 60) => {
      const container = targetContainer?.current || targetContainer || containerRef?.current;
      if (container && container.clientHeight) {
        const availableHeight = Math.max(200, container.clientHeight - padding);
        const optimalScale = Math.max(minScale, Math.min(maxScale, availableHeight / baseHeight));
        const clamped = parseFloat(optimalScale.toFixed(2));
        setScale(clamped);
        setIsFitWidthActive(false);
        return clamped;
      }
      return scale;
    },
    [containerRef, baseHeight, minScale, maxScale, scale]
  );

  /**
   * Explicitly recalibrates zoom when viewport container dimensions shift.
   * Useful when split-screen panes are resized (e.g. 50/50 -> 66/33).
   *
   * @param {React.RefObject|HTMLElement} [targetContainer]
   */
  const recalibrateZoom = useCallback(
    (targetContainer = null) => {
      const container = targetContainer?.current || targetContainer || containerRef?.current;
      if (!container) return;

      if (isFitWidthActive) {
        fitWidth(container);
      } else {
        // If container becomes too narrow for current zoom scale, recalibrate
        const currentPaperWidth = baseWidth * scale;
        const availableWidth = container.clientWidth - 40;
        if (currentPaperWidth > availableWidth && availableWidth > 200) {
          fitWidth(container, 40);
        }
      }
    },
    [containerRef, isFitWidthActive, fitWidth, baseWidth, scale]
  );

  /**
   * ResizeObserver integration for automatic viewport zoom recalibration.
   */
  useEffect(() => {
    if (!autoRecalibrateOnResize || !containerRef?.current || typeof ResizeObserver === 'undefined') {
      return;
    }

    const element = containerRef.current;
    let resizeTimer = null;

    resizeObserverRef.current = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        recalibrateZoom(element);
      }, 150);
    });

    resizeObserverRef.current.observe(element);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [autoRecalibrateOnResize, containerRef, recalibrateZoom]);

  return {
    scale,
    setScale: setClampedScale,
    zoomIn,
    zoomOut,
    resetZoom,
    fitWidth,
    fitPage,
    recalibrateZoom,
    isFitWidthActive,
    minScale,
    maxScale,
    zoomPercentage: Math.round(scale * 100),
  };
}

export default usePDFZoom;

