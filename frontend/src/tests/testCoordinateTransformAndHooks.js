import assert from 'node:assert';
import test from 'node:test';
import {
  normalizeBoundingBox,
  normalizedToCanvasPixels,
  pdfPointsToViewportPixels,
  recalibrateZoomForContainer,
  getConfidenceTier,
  parseCitationMetadata,
  renderBoundingBoxOnCanvas,
  DEFAULT_PAGE_WIDTH_POINTS,
  DEFAULT_PAGE_HEIGHT_POINTS,
} from '../utils/coordinateTransform.js';

test('1. Coordinate Transformation - normalizeBoundingBox with [x1, y1, x2, y2] percentages', () => {
  const input = [6.0, 17.5, 94.0, 23.0];
  const box = normalizeBoundingBox(input);

  assert.strictEqual(box.x, 6.0);
  assert.strictEqual(box.y, 17.5);
  assert.strictEqual(box.width, 88.0);
  assert.strictEqual(box.height, 5.5);
  assert.strictEqual(box.unitX, 0.06);
  assert.strictEqual(box.unitY, 0.175);
  assert.strictEqual(box.unitWidth, 0.88);
  assert.strictEqual(box.unitHeight, 0.055);
  assert.strictEqual(box.centerX, 50.0);
  assert.strictEqual(box.centerY, 20.25);
});

test('2. Coordinate Transformation - normalizeBoundingBox with unit interval [0, 1]', () => {
  const input = [0.06, 0.175, 0.94, 0.23];
  const box = normalizeBoundingBox(input);

  assert.strictEqual(box.isUnitInterval, true);
  assert.strictEqual(box.x, 6.0);
  assert.strictEqual(box.y, 17.5);
  assert.strictEqual(box.width, 88.0);
  assert.strictEqual(box.height, 5.5);
});

test('3. Coordinate Transformation - normalizeBoundingBox with { x, y, width, height } object', () => {
  const input = { x: 10.0, y: 25.0, width: 80.0, height: 12.0 };
  const box = normalizeBoundingBox(input);

  assert.strictEqual(box.x, 10.0);
  assert.strictEqual(box.y, 25.0);
  assert.strictEqual(box.width, 80.0);
  assert.strictEqual(box.height, 12.0);
  assert.strictEqual(box.x1, 10.0);
  assert.strictEqual(box.y1, 25.0);
  assert.strictEqual(box.x2, 90.0);
  assert.strictEqual(box.y2, 37.0);
});

test('4. Coordinate Transformation - normalizeBoundingBox with absolute PDF user points (> 100)', () => {
  const input = [72, 144, 540, 216]; // 72 DPI points on 612 x 792 page
  const box = normalizeBoundingBox(input, { width: 612, height: 792 });

  assert.strictEqual(box.isAbsolutePoints, true);
  assert.ok(box.x > 11.5 && box.x < 12.0); // 72 / 612 * 100 ~ 11.76%
  assert.ok(box.y > 18.0 && box.y < 18.5); // 144 / 792 * 100 ~ 18.18%
  assert.ok(box.width > 76.0 && box.width < 77.0);
});

test('5. Coordinate Transformation - normalizedToCanvasPixels with DPR scaling', () => {
  const box = normalizeBoundingBox([10.0, 20.0, 90.0, 30.0]); // 80% width, 10% height
  const pixels1x = normalizedToCanvasPixels(box, 1000, 2000, 1.0);

  assert.strictEqual(pixels1x.x, 100);
  assert.strictEqual(pixels1x.y, 400);
  assert.strictEqual(pixels1x.width, 800);
  assert.strictEqual(pixels1x.height, 200);

  const pixels2x = normalizedToCanvasPixels(box, 1000, 2000, 2.0);
  assert.strictEqual(pixels2x.dprX, 200);
  assert.strictEqual(pixels2x.dprY, 800);
  assert.strictEqual(pixels2x.dprWidth, 1600);
  assert.strictEqual(pixels2x.dprHeight, 400);
});

test('6. Coordinate Transformation - pdfPointsToViewportPixels with PDF.js mock viewport', () => {
  const mockViewport = {
    scale: 1.5,
    convertToViewportRectangle: ([x1, y1, x2, y2]) => [x1 * 1.5, y1 * 1.5, x2 * 1.5, y2 * 1.5],
  };

  const result = pdfPointsToViewportPixels([10, 20, 110, 70], mockViewport, 2.0);
  assert.strictEqual(result.x, 15);
  assert.strictEqual(result.y, 30);
  assert.strictEqual(result.width, 150);
  assert.strictEqual(result.height, 75);
  assert.strictEqual(result.dprWidth, 300);
  assert.strictEqual(result.dprHeight, 150);
});

test('7. Viewport Zoom Recalibration - recalibrateZoomForContainer', () => {
  // Container width 760px, baseWidth 680, padding 80 -> available 680 -> scale 1.00
  const container = { clientWidth: 760 };
  const scale = recalibrateZoomForContainer(container, 680, 80);
  assert.strictEqual(scale, 1.0);

  // Wide container 1440px -> available 1360 -> scale 2.00
  const wideContainer = { clientWidth: 1440 };
  const wideScale = recalibrateZoomForContainer(wideContainer, 680, 80);
  assert.strictEqual(wideScale, 2.0);

  // Narrow container 350px -> clamped to minScale 0.50
  const narrowContainer = { clientWidth: 350 };
  const narrowScale = recalibrateZoomForContainer(narrowContainer, 680, 80);
  assert.strictEqual(narrowScale, 0.5);
});

test('8. Confidence Tiers - getConfidenceTier classification and styling tokens', () => {
  // Verified tier (>= 0.90)
  const verified = getConfidenceTier(0.96);
  assert.strictEqual(verified.tier, 'verified');
  assert.strictEqual(verified.percentage, 96);
  assert.strictEqual(verified.accentHex, '#10b981');
  assert.ok(verified.shadowStyle.includes('16, 185, 129'));

  // Grounded tier (0.75 - 0.89)
  const grounded = getConfidenceTier(0.85);
  assert.strictEqual(grounded.tier, 'grounded');
  assert.strictEqual(grounded.percentage, 85);
  assert.strictEqual(grounded.accentHex, '#2563eb');
  assert.ok(grounded.shadowStyle.includes('37, 99, 235'));

  // Review tier (0.50 - 0.74)
  const review = getConfidenceTier(0.68);
  assert.strictEqual(review.tier, 'review');
  assert.strictEqual(review.percentage, 68);
  assert.strictEqual(review.accentHex, '#f59e0b');

  // Alert tier (< 0.50)
  const alertTier = getConfidenceTier(0.42);
  assert.strictEqual(alertTier.tier, 'alert');
  assert.strictEqual(alertTier.percentage, 42);
  assert.strictEqual(alertTier.accentHex, '#ef4444');
});

test('9. Citation Metadata Parser - RAG API payload structure', () => {
  const ragApiCitation = {
    page_number: 2,
    bounding_box: [6.0, 17.5, 94.0, 23.0],
    confidence_score: 0.94,
    snippet: 'Global Query Filters guarantee cryptographic and logical database separation per tenant GUID.',
    document_id: 'Security_Isolation_Architecture.pdf',
    label: 'Tenant Boundary Assertion',
  };

  const parsed = parseCitationMetadata(ragApiCitation, 0);

  assert.strictEqual(parsed.page, 2);
  assert.strictEqual(parsed.page_number, 2);
  assert.strictEqual(parsed.score, 0.94);
  assert.strictEqual(parsed.confidence_score, 0.94);
  assert.strictEqual(parsed.tier, 'verified');
  assert.strictEqual(parsed.x, 6.0);
  assert.strictEqual(parsed.y, 17.5);
  assert.strictEqual(parsed.width, 88.0);
  assert.strictEqual(parsed.height, 5.5);
  assert.strictEqual(parsed.snippet, ragApiCitation.snippet);
  assert.strictEqual(parsed.label, 'Tenant Boundary Assertion');
  assert.strictEqual(parsed.document_id, 'Security_Isolation_Architecture.pdf');
});

test('10. Canvas 2D Direct Vector Drawing - renderBoundingBoxOnCanvas execution', () => {
  const drawCalls = [];
  const mockCtx = {
    canvas: { width: 1000, height: 2000 },
    save: () => drawCalls.push('save'),
    restore: () => drawCalls.push('restore'),
    beginPath: () => drawCalls.push('beginPath'),
    roundRect: (x, y, w, h, r) => drawCalls.push(`roundRect:${x},${y},${w},${h},${r}`),
    fill: () => drawCalls.push('fill'),
    stroke: () => drawCalls.push('stroke'),
    fillRect: (x, y, w, h) => drawCalls.push(`fillRect:${x},${y},${w},${h}`),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  };

  const bbox = {
    unitX: 0.1,
    unitY: 0.2,
    unitWidth: 0.8,
    unitHeight: 0.05,
    score: 0.96,
  };

  renderBoundingBoxOnCanvas(mockCtx, bbox, {
    isSelected: true,
    score: 0.96,
    viewportWidth: 1000,
    viewportHeight: 2000,
    dpr: 1,
  });

  assert.ok(drawCalls.includes('save'));
  assert.ok(drawCalls.includes('beginPath'));
  assert.ok(drawCalls.includes('roundRect:100,400,800,100,4'));
  assert.ok(drawCalls.includes('fill'));
  assert.ok(drawCalls.includes('stroke'));
  assert.ok(drawCalls.includes('restore'));
  assert.strictEqual(mockCtx.shadowColor, '#10b981');
  assert.strictEqual(mockCtx.shadowBlur, 12);
});

test('11. Split View Navigation Hook Logic - layout modes and pane classes', () => {
  // Test split view layout transitions and class generation
  const validLayouts = ['balanced', 'wide-pdf', 'wide-chat', 'full-pdf', 'full-chat'];
  let currentLayout = 'balanced';

  const getContainerGridClass = (layout) => {
    switch (layout) {
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
  };

  const getLeftPaneClass = (layout) => {
    if (layout === 'full-chat') return 'hidden';
    switch (layout) {
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
  };

  validLayouts.forEach((layout) => {
    const gridClass = getContainerGridClass(layout);
    const leftClass = getLeftPaneClass(layout);
    assert.ok(typeof gridClass === 'string');
    assert.ok(typeof leftClass === 'string');
  });

  assert.strictEqual(getLeftPaneClass('full-chat'), 'hidden');
  assert.ok(getLeftPaneClass('wide-pdf').includes('lg:col-span-8'));
  assert.ok(getLeftPaneClass('wide-chat').includes('lg:col-span-5'));
});

test('12. Citation Grouping & Partitioning by Page', () => {
  const rawCitations = [
    { page_number: 1, bounding_box: [10, 20, 90, 25], confidence_score: 0.95, snippet: 'Page 1 passage' },
    { page_number: 1, bounding_box: [10, 30, 90, 35], confidence_score: 0.91, snippet: 'Page 1 second passage' },
    { page_number: 2, bounding_box: [15, 40, 85, 46], confidence_score: 0.88, snippet: 'Page 2 passage' },
  ];

  const parsed = rawCitations.map((c, i) => parseCitationMetadata(c, i));

  const citationsByPage = {};
  parsed.forEach((c) => {
    if (!citationsByPage[c.page]) citationsByPage[c.page] = [];
    citationsByPage[c.page].push(c);
  });

  assert.strictEqual(citationsByPage[1].length, 2);
  assert.strictEqual(citationsByPage[2].length, 1);
  assert.strictEqual(citationsByPage[1][0].page, 1);
  assert.strictEqual(citationsByPage[2][0].page, 2);
  assert.strictEqual(citationsByPage[1][0].tier, 'verified');
  assert.strictEqual(citationsByPage[2][0].tier, 'grounded');
});

test('13. Smooth Auto-Scroll Target Calculation', () => {
  // Test vertical coordinate centering calculation
  const mockPageEl = {
    offsetTop: 800,
    clientHeight: 900,
  };
  const mockContainer = {
    clientHeight: 600,
  };

  const citation = {
    page: 2,
    y: 25.0, // 25% down the page
  };

  const pageTop = mockPageEl.offsetTop;
  const citationPixelOffset = (citation.y / 100) * mockPageEl.clientHeight;
  const targetPixelY = pageTop + citationPixelOffset; // 800 + 225 = 1025
  const offsetDivisor = 2.5;
  const targetScrollTop = Math.max(0, targetPixelY - mockContainer.clientHeight / offsetDivisor);

  // 1025 - (600 / 2.5) = 1025 - 240 = 785
  assert.strictEqual(targetScrollTop, 785);
});
