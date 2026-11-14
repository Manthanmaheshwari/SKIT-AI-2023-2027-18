/**
 * Coordinate Transformation Utility for PDF.js Canvas & Bounding-Box Overlays
 *
 * Provides bidirectional transformations between:
 * 1. RAG API source citation metadata (page_number, bounding_box: [x1, y1, x2, y2], confidence_score)
 * 2. Normalized percentage coordinates [0, 100] (for responsive CSS layout & overlays)
 * 3. Unit normalized coordinates [0, 1]
 * 4. PDF User Units / Points (72 DPI standard, bottom-left origin)
 * 5. Viewport / HTML5 Canvas layout & backing-store buffer pixels (scaled by DPR & zoom)
 */

/**
 * Standard PDF reference dimensions (72 DPI, US Letter / A4 approximate standard)
 */
export const DEFAULT_PAGE_WIDTH_POINTS = 612;
export const DEFAULT_PAGE_HEIGHT_POINTS = 792;
export const DEFAULT_CANVAS_BASE_WIDTH = 680;
export const DEFAULT_CANVAS_BASE_HEIGHT = 940;

/**
 * Normalizes any bounding box input representation into a canonical coordinate object.
 *
 * Supported input formats:
 * - Array: [x1, y1, x2, y2] (RAG API standard)
 * - Array: [x, y, width, height]
 * - Object: { x1, y1, x2, y2 }
 * - Object: { x, y, width, height }
 * - Object: { left, top, width, height }
 *
 * @param {Array<number>|Object} bboxInput - Input bounding box representation.
 * @param {Object} [pageDimensions] - Optional page reference dimensions { width, height }.
 * @returns {Object} Canonical normalized bounding box with percentage and unit metrics.
 */
export function normalizeBoundingBox(bboxInput, pageDimensions = {}) {
  const refWidth = pageDimensions.width || DEFAULT_PAGE_WIDTH_POINTS;
  const refHeight = pageDimensions.height || DEFAULT_PAGE_HEIGHT_POINTS;

  let rawX1 = 0;
  let rawY1 = 0;
  let rawX2 = 0;
  let rawY2 = 0;

  if (Array.isArray(bboxInput)) {
    if (bboxInput.length >= 4) {
      const [v0, v1, v2, v3] = bboxInput.map(Number);
      // Check if format is [x, y, width, height] where v2, v3 are dimensions
      // If v2 < v0 or v3 < v1, it's definitely [x1, y1, x2, y2]
      // In RAG API, bounding_box is [x1, y1, x2, y2]
      if (v2 > v0 && v3 > v1 && v2 <= 100 && v3 <= 100 && v0 < v2 && v1 < v3) {
        // [x1, y1, x2, y2]
        rawX1 = Math.min(v0, v2);
        rawY1 = Math.min(v1, v3);
        rawX2 = Math.max(v0, v2);
        rawY2 = Math.max(v1, v3);
      } else if (v2 > 0 && v3 > 0 && v0 + v2 <= 105 && v1 + v3 <= 105) {
        // [x, y, width, height]
        rawX1 = v0;
        rawY1 = v1;
        rawX2 = v0 + v2;
        rawY2 = v1 + v3;
      } else {
        // Standard [x1, y1, x2, y2]
        rawX1 = Math.min(v0, v2);
        rawY1 = Math.min(v1, v3);
        rawX2 = Math.max(v0, v2);
        rawY2 = Math.max(v1, v3);
      }
    }
  } else if (bboxInput && typeof bboxInput === 'object') {
    if (bboxInput.x1 !== undefined && bboxInput.y1 !== undefined) {
      rawX1 = Math.min(Number(bboxInput.x1), Number(bboxInput.x2 ?? bboxInput.x1));
      rawY1 = Math.min(Number(bboxInput.y1), Number(bboxInput.y2 ?? bboxInput.y1));
      rawX2 = Math.max(Number(bboxInput.x1), Number(bboxInput.x2 ?? bboxInput.x1));
      rawY2 = Math.max(Number(bboxInput.y1), Number(bboxInput.y2 ?? bboxInput.y1));
    } else if (bboxInput.x !== undefined && bboxInput.y !== undefined) {
      rawX1 = Number(bboxInput.x);
      rawY1 = Number(bboxInput.y);
      const w = Number(bboxInput.width ?? bboxInput.w ?? 0);
      const h = Number(bboxInput.height ?? bboxInput.h ?? 0);
      rawX2 = rawX1 + w;
      rawY2 = rawY1 + h;
    } else if (bboxInput.left !== undefined && bboxInput.top !== undefined) {
      rawX1 = Number(bboxInput.left);
      rawY1 = Number(bboxInput.top);
      const w = Number(bboxInput.width ?? 0);
      const h = Number(bboxInput.height ?? 0);
      rawX2 = rawX1 + w;
      rawY2 = rawY1 + h;
    }
  }

  // Detect coordinate scale:
  // 1. Normalized unit [0, 1] (e.g. 0.06, 0.175, 0.88, 0.055)
  // 2. Percentage [0, 100] (e.g. 6.0, 17.5, 88.0, 5.5)
  // 3. Absolute PDF user points / pixels (> 100, e.g. 500, 750)
  const isUnitInterval = rawX2 <= 1.05 && rawY2 <= 1.05 && (rawX2 > 0 || rawY2 > 0);
  const isAbsolutePoints = rawX2 > 100 || rawY2 > 100;

  let pctX1 = 0;
  let pctY1 = 0;
  let pctX2 = 0;
  let pctY2 = 0;

  if (isUnitInterval) {
    pctX1 = rawX1 * 100;
    pctY1 = rawY1 * 100;
    pctX2 = rawX2 * 100;
    pctY2 = rawY2 * 100;
  } else if (isAbsolutePoints) {
    pctX1 = (rawX1 / refWidth) * 100;
    pctY1 = (rawY1 / refHeight) * 100;
    pctX2 = (rawX2 / refWidth) * 100;
    pctY2 = (rawY2 / refHeight) * 100;
  } else {
    // Already in percentage [0, 100]
    pctX1 = rawX1;
    pctY1 = rawY1;
    pctX2 = rawX2;
    pctY2 = rawY2;
  }

  // Clamp percentages within page boundaries
  pctX1 = Math.max(0, Math.min(100, pctX1));
  pctY1 = Math.max(0, Math.min(100, pctY1));
  pctX2 = Math.max(pctX1, Math.min(100, pctX2));
  pctY2 = Math.max(pctY1, Math.min(100, pctY2));

  const pctWidth = Math.max(0.5, pctX2 - pctX1);
  const pctHeight = Math.max(0.5, pctY2 - pctY1);

  return {
    // Percentage metrics (0 - 100) for CSS layout
    x: parseFloat(pctX1.toFixed(3)),
    y: parseFloat(pctY1.toFixed(3)),
    width: parseFloat(pctWidth.toFixed(3)),
    height: parseFloat(pctHeight.toFixed(3)),
    x1: parseFloat(pctX1.toFixed(3)),
    y1: parseFloat(pctY1.toFixed(3)),
    x2: parseFloat(pctX2.toFixed(3)),
    y2: parseFloat(pctY2.toFixed(3)),

    // Unit normalized metrics (0.0 - 1.0)
    unitX: parseFloat((pctX1 / 100).toFixed(5)),
    unitY: parseFloat((pctY1 / 100).toFixed(5)),
    unitWidth: parseFloat((pctWidth / 100).toFixed(5)),
    unitHeight: parseFloat((pctHeight / 100).toFixed(5)),

    // Center coordinates in percentage
    centerX: parseFloat((pctX1 + pctWidth / 2).toFixed(3)),
    centerY: parseFloat((pctY1 + pctHeight / 2).toFixed(3)),

    // Original detection flags
    isUnitInterval,
    isAbsolutePoints,
  };
}

/**
 * Converts normalized bounding box coordinates to viewport pixel dimensions.
 *
 * @param {Object} normalizedBox - Canonical box from normalizeBoundingBox.
 * @param {number} viewportWidth - CSS width of the rendered canvas / page container.
 * @param {number} viewportHeight - CSS height of the rendered canvas / page container.
 * @param {number} [dpr=1] - Device pixel ratio for backing buffer rendering.
 * @returns {Object} Pixel bounding box { x, y, width, height, dprX, dprY, dprWidth, dprHeight }.
 */
export function normalizedToCanvasPixels(normalizedBox, viewportWidth, viewportHeight, dpr = 1) {
  const norm = normalizedBox.unitWidth !== undefined
    ? normalizedBox
    : normalizeBoundingBox(normalizedBox);

  const cssX = Math.round(norm.unitX * viewportWidth);
  const cssY = Math.round(norm.unitY * viewportHeight);
  const cssWidth = Math.max(4, Math.round(norm.unitWidth * viewportWidth));
  const cssHeight = Math.max(4, Math.round(norm.unitHeight * viewportHeight));

  return {
    // CSS layout pixels (1:1 with style.left / style.top)
    x: cssX,
    y: cssY,
    width: cssWidth,
    height: cssHeight,

    // Internal canvas buffer pixels (scaled by DPR)
    dprX: Math.round(cssX * dpr),
    dprY: Math.round(cssY * dpr),
    dprWidth: Math.round(cssWidth * dpr),
    dprHeight: Math.round(cssHeight * dpr),
  };
}

/**
 * Converts PDF user points [x1, y1, x2, y2] to viewport pixels using PDF.js viewport.
 *
 * In standard PDF user space, origin is bottom-left and y points upward.
 * PDF.js `viewport.convertToViewportRectangle` converts [x1, y1, x2, y2] into
 * viewport coordinates where origin is top-left and y points downward.
 *
 * @param {Array<number>} pdfPointsRect - [x1, y1, x2, y2] in PDF points.
 * @param {Object} viewport - PDF.js viewport instance (from page.getViewport({ scale })).
 * @param {number} [dpr=1] - Device pixel ratio.
 * @returns {Object} Pixel bounding box.
 */
export function pdfPointsToViewportPixels(pdfPointsRect, viewport, dpr = 1) {
  if (!viewport || typeof viewport.convertToViewportRectangle !== 'function') {
    // Fallback: estimate using scale
    const scale = viewport?.scale || 1;
    const [x1, y1, x2, y2] = pdfPointsRect;
    const box = normalizeBoundingBox([x1, y1, x2, y2]);
    const vpWidth = (viewport?.width || DEFAULT_CANVAS_BASE_WIDTH) * scale;
    const vpHeight = (viewport?.height || DEFAULT_CANVAS_BASE_HEIGHT) * scale;
    return normalizedToCanvasPixels(box, vpWidth, vpHeight, dpr);
  }

  const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle(pdfPointsRect);
  const minX = Math.min(vx1, vx2);
  const minY = Math.min(vy1, vy2);
  const width = Math.max(4, Math.abs(vx2 - vx1));
  const height = Math.max(4, Math.abs(vy2 - vy1));

  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.round(width),
    height: Math.round(height),
    dprX: Math.round(minX * dpr),
    dprY: Math.round(minY * dpr),
    dprWidth: Math.round(width * dpr),
    dprHeight: Math.round(height * dpr),
  };
}

/**
 * Recalibrates viewport zoom multiplier so that a cited bounding box or page
 * fits comfortably within the scroll container.
 *
 * @param {Object} container - Scrollable container element handle.
 * @param {Object} bbox - Normalized bounding box of citation.
 * @param {number} [baseWidth=DEFAULT_CANVAS_BASE_WIDTH] - Standard paper width.
 * @param {number} [padding=80] - Left and right container gutter padding.
 * @returns {number} Clamped zoom scale multiplier.
 */
export function recalibrateZoomForContainer(container, baseWidth = DEFAULT_CANVAS_BASE_WIDTH, padding = 80) {
  if (!container || !container.clientWidth) {
    return 1.15;
  }
  const availableWidth = Math.max(300, container.clientWidth - padding);
  const targetScale = availableWidth / baseWidth;
  // Clamp between 0.50x and 2.50x
  return parseFloat(Math.max(0.5, Math.min(2.5, targetScale)).toFixed(2));
}

/**
 * Calculates visual confidence tier tokens for semantic citations.
 * Supports enterprise grading:
 * - Verified (score >= 0.90): Emerald
 * - Grounded (0.75 <= score < 0.90): Blue
 * - Review (0.50 <= score < 0.75): Amber
 * - Alert (score < 0.50): Rose
 *
 * @param {number} [score=0.90] - Confidence score in range [0, 1] or [0, 100].
 * @returns {Object} Tier styling tokens and glowing palette values.
 */
export function getConfidenceTier(score = 0.90) {
  // Normalize score to 0..1 if provided as percentage 0..100
  const normalizedScore = score > 1 ? score / 100 : score;

  if (normalizedScore >= 0.90) {
    return {
      tier: 'verified',
      score: normalizedScore,
      percentage: Math.round(normalizedScore * 100),
      label: 'Verified Grounding',
      badgeText: `${Math.round(normalizedScore * 100)}% Verified`,
      badgeClass: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950',
      borderClass: 'border-emerald-500',
      ringClass: 'ring-emerald-400/50',
      bgFillClass: 'bg-emerald-500/15',
      activeBgClass: 'bg-emerald-500/30',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      accentHex: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.65)',
      canvasFill: 'rgba(16, 185, 129, 0.16)',
      canvasActiveFill: 'rgba(16, 185, 129, 0.32)',
      canvasStroke: '#10b981',
      canvasGlow: '#10b981',
      shadowStyle: '0 0 16px rgba(16, 185, 129, 0.6), inset 0 0 10px rgba(16, 185, 129, 0.2)',
    };
  }
  if (normalizedScore >= 0.75) {
    return {
      tier: 'grounded',
      score: normalizedScore,
      percentage: Math.round(normalizedScore * 100),
      label: 'Grounded Passage',
      badgeText: `${Math.round(normalizedScore * 100)}% Grounded`,
      badgeClass: 'bg-blue-600 text-white dark:bg-blue-500 dark:text-zinc-950',
      borderClass: 'border-blue-500',
      ringClass: 'ring-blue-400/50',
      bgFillClass: 'bg-blue-500/15',
      activeBgClass: 'bg-blue-600/30',
      textClass: 'text-blue-700 dark:text-blue-400',
      accentHex: '#2563eb',
      glowColor: 'rgba(37, 99, 235, 0.65)',
      canvasFill: 'rgba(37, 99, 235, 0.16)',
      canvasActiveFill: 'rgba(37, 99, 235, 0.32)',
      canvasStroke: '#2563eb',
      canvasGlow: '#2563eb',
      shadowStyle: '0 0 16px rgba(37, 99, 235, 0.6), inset 0 0 10px rgba(37, 99, 235, 0.2)',
    };
  }
  if (normalizedScore >= 0.50) {
    return {
      tier: 'review',
      score: normalizedScore,
      percentage: Math.round(normalizedScore * 100),
      label: 'Review Context',
      badgeText: `${Math.round(normalizedScore * 100)}% Review`,
      badgeClass: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-zinc-950',
      borderClass: 'border-amber-500',
      ringClass: 'ring-amber-400/50',
      bgFillClass: 'bg-amber-500/15',
      activeBgClass: 'bg-amber-500/30',
      textClass: 'text-amber-700 dark:text-amber-400',
      accentHex: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.65)',
      canvasFill: 'rgba(245, 158, 11, 0.16)',
      canvasActiveFill: 'rgba(245, 158, 11, 0.32)',
      canvasStroke: '#f59e0b',
      canvasGlow: '#f59e0b',
      shadowStyle: '0 0 16px rgba(245, 158, 11, 0.6), inset 0 0 10px rgba(245, 158, 11, 0.2)',
    };
  }
  return {
    tier: 'alert',
    score: normalizedScore,
    percentage: Math.round(normalizedScore * 100),
    label: 'Unverified Alert',
    badgeText: `${Math.round(normalizedScore * 100)}% Alert`,
    badgeClass: 'bg-rose-600 text-white dark:bg-rose-500 dark:text-zinc-950',
    borderClass: 'border-rose-500',
    ringClass: 'ring-rose-400/50',
    bgFillClass: 'bg-rose-500/15',
    activeBgClass: 'bg-rose-500/30',
    textClass: 'text-rose-700 dark:text-rose-400',
    accentHex: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.65)',
    canvasFill: 'rgba(239, 68, 68, 0.16)',
    canvasActiveFill: 'rgba(239, 68, 68, 0.32)',
    canvasStroke: '#ef4444',
    canvasGlow: '#ef4444',
    shadowStyle: '0 0 16px rgba(239, 68, 68, 0.6), inset 0 0 10px rgba(239, 68, 68, 0.2)',
  };
}

/**
 * Standardizes source citation metadata returned by the RAG API or internal vector stores.
 *
 * Input citation can have:
 * - `page_number` or `page` (1-indexed)
 * - `bounding_box`: [x1, y1, x2, y2] or { x, y, width, height }
 * - `confidence_score` or `score`
 * - `snippet`, `content`, `text`
 * - `document_id`, `chunk_id`, `id`
 * - `label`
 *
 * @param {Object} rawCitation - Citation object from RAG API.
 * @param {number} [index=0] - Fallback sequence index.
 * @param {string} [defaultDocTitle=''] - Default fallback document identifier.
 * @returns {Object} Standardized citation item with normalized coordinates and tier tokens.
 */
export function parseCitationMetadata(rawCitation = {}, index = 0, defaultDocTitle = '') {
  if (!rawCitation) return null;

  // Extract page number (1-indexed)
  const page = Number(
    rawCitation.page_number ??
    rawCitation.page ??
    rawCitation.metadata?.page ??
    rawCitation.metadata?.page_number ??
    1
  );

  // Extract confidence score
  const score = Number(
    rawCitation.confidence_score ??
    rawCitation.score ??
    rawCitation.confidence ??
    rawCitation.metadata?.confidence_score ??
    rawCitation.metadata?.score ??
    0.90
  );

  // Extract bounding box representation
  const rawBBox =
    rawCitation.bounding_box ??
    rawCitation.bbox ??
    rawCitation.metadata?.bounding_box ??
    rawCitation.metadata?.bbox ??
    (rawCitation.x !== undefined
      ? { x: rawCitation.x, y: rawCitation.y, width: rawCitation.width, height: rawCitation.height }
      : null);

  // Normalize coordinates into canonical format
  const normBox = rawBBox
    ? normalizeBoundingBox(rawBBox)
    : {
        x: 6.0,
        y: 18.0 + (index % 3) * 10,
        width: 88.0,
        height: 6.0,
        x1: 6.0,
        y1: 18.0 + (index % 3) * 10,
        x2: 94.0,
        y2: 24.0 + (index % 3) * 10,
        unitX: 0.06,
        unitY: (18.0 + (index % 3) * 10) / 100,
        unitWidth: 0.88,
        unitHeight: 0.06,
        centerX: 50.0,
        centerY: 21.0 + (index % 3) * 10,
      };

  const snippet =
    rawCitation.snippet ??
    rawCitation.content ??
    rawCitation.text ??
    'Grounded assertion from indexed knowledge base.';

  const document_id =
    rawCitation.document_id ??
    rawCitation.doc_id ??
    rawCitation.metadata?.document_id ??
    defaultDocTitle ??
    'Active Document';

  const id =
    rawCitation.id ??
    rawCitation.chunk_id ??
    rawCitation.citation_id ??
    `cit-${page}-${normBox.x.toFixed(0)}-${normBox.y.toFixed(0)}-${index}`;

  const label =
    rawCitation.label ??
    `Citation #${index + 1} (Page ${page})`;

  const tier = getConfidenceTier(score);

  return {
    id,
    document_id,
    page,
    page_number: page,
    score,
    confidence_score: score,
    snippet,
    label,
    tier: tier.tier,
    tierInfo: tier,

    // Normalized coordinates (Percentage 0-100)
    x: normBox.x,
    y: normBox.y,
    width: normBox.width,
    height: normBox.height,
    x1: normBox.x1,
    y1: normBox.y1,
    x2: normBox.x2,
    y2: normBox.y2,

    // Unit coordinates (0-1)
    unitX: normBox.unitX,
    unitY: normBox.unitY,
    unitWidth: normBox.unitWidth,
    unitHeight: normBox.unitHeight,
    centerX: normBox.centerX,
    centerY: normBox.centerY,

    // Retain original metadata
    raw: rawCitation,
  };
}

/**
 * Draws a glowing, semi-transparent highlight bounding box directly on an HTML5 2D Canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx - Target 2D rendering context.
 * @param {Object} bbox - Normalized or pixel-transformed bounding box.
 * @param {Object} [options] - Custom rendering options.
 */
export function renderBoundingBoxOnCanvas(ctx, bbox, options = {}) {
  if (!ctx || !bbox) return;

  const {
    isSelected = false,
    score = bbox.score ?? 0.90,
    viewportWidth = ctx.canvas.width,
    viewportHeight = ctx.canvas.height,
    dpr = 1,
    cornerRadius = 4,
  } = options;

  const tier = getConfidenceTier(score);

  // Compute exact buffer pixels
  let px, py, pw, ph;
  if (bbox.dprX !== undefined) {
    px = bbox.dprX;
    py = bbox.dprY;
    pw = bbox.dprWidth;
    ph = bbox.dprHeight;
  } else if (bbox.unitX !== undefined) {
    px = Math.round(bbox.unitX * viewportWidth);
    py = Math.round(bbox.unitY * viewportHeight);
    pw = Math.max(4, Math.round(bbox.unitWidth * viewportWidth));
    ph = Math.max(4, Math.round(bbox.unitHeight * viewportHeight));
  } else {
    const norm = normalizeBoundingBox(bbox);
    px = Math.round(norm.unitX * viewportWidth);
    py = Math.round(norm.unitY * viewportHeight);
    pw = Math.max(4, Math.round(norm.unitWidth * viewportWidth));
    ph = Math.max(4, Math.round(norm.unitHeight * viewportHeight));
  }

  ctx.save();

  // 1. Semi-transparent glowing fill
  ctx.fillStyle = isSelected ? tier.canvasActiveFill : tier.canvasFill;

  // 2. Glowing shadow effect
  ctx.shadowColor = tier.canvasGlow;
  ctx.shadowBlur = isSelected ? 18 * dpr : 8 * dpr;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // 3. Stroke border with rounded corners
  ctx.strokeStyle = tier.canvasStroke;
  ctx.lineWidth = isSelected ? 2.5 * dpr : 1.5 * dpr;

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(px, py, pw, ph, cornerRadius * dpr);
  } else {
    ctx.rect(px, py, pw, ph);
  }
  ctx.fill();
  ctx.stroke();

  // 4. Subtle inner glowing accent bar on the left edge
  ctx.fillStyle = tier.accentHex;
  ctx.shadowBlur = isSelected ? 12 * dpr : 4 * dpr;
  ctx.fillRect(px, py, 3 * dpr, ph);

  ctx.restore();
}

