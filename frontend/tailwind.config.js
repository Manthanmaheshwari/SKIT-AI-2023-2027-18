/**
 * =============================================================================
 * Enterprise Multi-Tenant AI Research Assistant Platform
 * Tailwind CSS Enterprise Theme Configuration Architecture
 * =============================================================================
 * 
 * Document Reference: SPEC-FE-TAILWIND-2026-V2
 * Runtime Target: Tailwind CSS 3.4.10, PostCSS 8.4.41, React 18.3.1, Vite 5.4.2
 * Architecture Standard: Stark Dual-Theme Enterprise B2B Design Paradigm
 * Maintained By: Lead UI/UX Frontend Architecture Group
 * Classification: Enterprise Engineering Standard
 * 
 * Design Principles:
 * 1. Stark Contrast Dual-Theme: Pure Stark-White (#FFFFFF) light mode baseline
 *    paired with Pure Deep-Black (#000000 / #09090B) dark mode baseline.
 * 2. Deterministic Semantic Color Economy: Zero informal pastels or saturated
 *    purples; strict palette consisting of Corporate Blue (#2563EB), Verified
 *    Emerald (#10B981), Warning Amber (#F59E0B), and Restrict Crimson (#EF4444).
 * 3. 4px/8px Spatial Mesh: Mathematical spatial rhythm with integer pixel boundaries.
 * 4. High-DPI Canvas Grounding: Explicit layout scales for PDF.js document sheets,
 *    bounding box overlays, citation inspector drawers, and split-pane viewports.
 * 
 * @type {import('tailwindcss').Config}
 */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/portals/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/context/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      /**
       * -----------------------------------------------------------------------
       * SECTION 1: GLOBAL ENTERPRISE COLOR PALETTES & HEX CODES
       * -----------------------------------------------------------------------
       * Curated HSL/Hex color scales engineered for strict WCAG 2.1 AA/AAA
       * compliance across stark-white and deep-black rendering environments.
       */
      colors: {
        // Legacy Brand Token Aliases (Maintained for backward compatibility)
        brand: {
          25: '#f7fee7',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        // Primary Enterprise Blue Palette (Actions, Focus, Grounding)
        primary: {
          25: '#f8faff',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Standard Enterprise Brand Anchor
          700: '#1d4ed8', // Button Hover Anchor
          800: '#1e40af', // Button Active / Pressed Anchor
          900: '#1e3a8a', // Dark Mode Accent Fill Anchor
          950: '#172554', // Dark Mode Subdued Backing Anchor
        },

        // Extended Corporate Blue Scale (Cross-Service Integration)
        blue: {
          25: '#f8faff',
          50: '#eff6ff',
          100: '#dbeafe',
          150: '#cedef9',
          200: '#bfdbfe',
          250: '#abcbfb',
          300: '#93c5fd',
          350: '#7cb5fb',
          400: '#60a5fa',
          450: '#4993f8',
          500: '#3b82f6',
          550: '#2f74f1',
          600: '#2563eb',
          650: '#2157d6',
          700: '#1d4ed8',
          750: '#1a44c2',
          800: '#1e40af',
          850: '#1c389c',
          900: '#1e3a8a',
          925: '#193074',
          950: '#172554',
          975: '#101b40',
        },

        // Slate Base Scale (Light-Mode Surfaces, Body Typography, Subtle Boundaries)
        slate: {
          25: '#fcfdfe',
          50: '#f8fafc',  // Secondary search strip & table header fill
          75: '#f4f7fb',
          100: '#f1f5f9', // Canvas viewport backdrop & code block backing
          150: '#eaeff5',
          200: '#e2e8f0', // Standard 1px Card Boundary & Sheet Outline
          250: '#d5dde7',
          300: '#cbd5e1', // Secondary button borders & input stroke
          350: '#b0bccd',
          400: '#94a3b8', // Placeholder copy & disabled icons
          450: '#7c8ba1',
          500: '#64748b', // Telemetry captions & page number counters
          550: '#546377',
          600: '#475569', // Section subtitles & secondary copy
          650: '#3c485a',
          700: '#334155', // Assistant synthesized dialogue text
          750: '#293444',
          800: '#1e293b', // Active tab labels & form headings
          850: '#162030',
          900: '#0f172a', // Primary high-contrast headings
          925: '#0b111c',
          950: '#020617', // Deep slate backing
          975: '#01030a',
        },

        // Zinc Dark-Mode Scale (Dark-Mode Surfaces, Structural Lines, OLED Backing)
        zinc: {
          25: '#fafbfc',
          50: '#fafafa',  // Dark-mode high-contrast headers
          75: '#f7f7f8',
          100: '#f4f4f5', // Document titles & primary telemetry
          150: '#ececed',
          200: '#e4e4e7', // Dark-mode synthesized response body copy
          250: '#dcdee1',
          300: '#d4d4d8', // Secondary navigation controls & inputs
          350: '#bcbec4',
          400: '#a1a1aa', // Timestamps & thumbnail page numbers
          450: '#8a8b92',
          500: '#71717a', // Input placeholders & disabled icon states
          550: '#5e5f67',
          600: '#52525b', // Tertiary borders & subtle lines
          650: '#46464e',
          700: '#3f3f46', // Hover fills on secondary controls
          750: '#323238',
          800: '#27272a', // Structural 1px boundary rules & inputs
          850: '#1f1f23',
          900: '#18181b', // Primary toolbars, chat dialogue, sheet cards
          925: '#111114',
          950: '#09090b', // Layout frames & top navigation backing
          975: '#040405',
          1000: '#000000', // Pure OLED Deep Black Canvas Backdrop
        },

        // Neutral Grayscale Scale (Universal Monochrome Tokens)
        neutral: {
          25: '#fcfcfc',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },

        // Semantic Verified Emerald Palette (High Confidence Grounding >= 90%, Gateway Online)
        emerald: {
          25: '#f7fef9',
          50: '#ecfdf5',
          100: '#d1fae5',
          150: '#bcf6d9',
          200: '#a7f3d0',
          250: '#8beec1',
          300: '#6ee7b7',
          350: '#51deab',
          400: '#34d399',
          450: '#21c68d',
          500: '#10b981', // Gateway active status pulse
          550: '#0da975',
          600: '#059669', // Verified citation badge fill
          650: '#05875e',
          700: '#047857',
          750: '#056b4f',
          800: '#065f46',
          850: '#04533d',
          900: '#064e3b',
          925: '#053e2f',
          950: '#022c22',
          975: '#011913',
        },

        // Semantic Warning Amber Palette (Ambiguous Citations 50-74%, Search Match Highlight)
        amber: {
          25: '#fffdf5',
          50: '#fffbeb',
          100: '#fef3c7',
          150: '#fdecaa',
          200: '#fde68a',
          250: '#fddf69',
          300: '#fcd34d',
          350: '#fbc737',
          400: '#fbbf24', // Active search highlight fill
          450: '#f7ae16',
          500: '#f59e0b', // Active search highlight border & pulse
          550: '#e58e08',
          600: '#d97706', // Review needed citation badge
          650: '#c56806',
          700: '#b45309',
          750: '#a2480a',
          800: '#92400e',
          850: '#83390f',
          900: '#78350f',
          925: '#5e290c',
          950: '#451a03',
          975: '#2d1002',
        },

        // Semantic Crimson Danger Palette (Policy Violations, Render Failure, <50% Grounding)
        rose: {
          25: '#fffbfa',
          50: '#fff1f2',
          100: '#ffe4e6',
          150: '#fed8dc',
          200: '#fecdd3',
          250: '#fdbbc3',
          300: '#fda4af',
          350: '#fc8a9a',
          400: '#fb7185',
          450: '#f7566f',
          500: '#f43f5e',
          550: '#e72c4d',
          600: '#e11d48',
          650: '#cf163e',
          700: '#be123c',
          750: '#ae1037',
          800: '#9f1239',
          850: '#911235',
          900: '#881337',
          925: '#6b0d2a',
          950: '#4c0519',
          975: '#2f020e',
        },

        // Extended Crimson Scale (System Diagnostics, Security Restrictions)
        danger: {
          25: '#fef8f8',
          50: '#fef2f2',
          100: '#fee2e2',
          150: '#fdd6d6',
          200: '#fecaca',
          250: '#fbb9b9',
          300: '#fca5a5',
          350: '#fa8e8e',
          400: '#f87171',
          450: '#f45757',
          500: '#ef4444', // Error toast banner stroke & alert badge
          550: '#e53636',
          600: '#dc2626',
          650: '#ca2020',
          700: '#b91c1c',
          750: '#a71919',
          800: '#991b1b',
          850: '#8b1919',
          900: '#7f1d1d',
          925: '#621616',
          950: '#450a0a',
          975: '#280505',
        },

        // Telemetry Sky Scale (Groq LPU Acceleration, Chain-of-Thought Stream)
        sky: {
          25: '#f7fbfe',
          50: '#f0f9ff',
          100: '#e0f2fe',
          150: '#cfe9fd',
          200: '#bae6fd',
          250: '#9bdcfd',
          300: '#7dd3fc',
          350: '#5ac7fa',
          400: '#38bdf8',
          450: '#1cb0f5',
          500: '#0ea5e9',
          550: '#0794d7',
          600: '#0284c7', // Chain-of-thought indicator
          650: '#0274b1',
          700: '#0369a1',
          750: '#055c8e',
          800: '#075985',
          850: '#0a4f76',
          900: '#0c4a6e',
          925: '#0a3b58',
          950: '#082f49',
          975: '#041c2d',
        },

        // Cyan Matrix Scale (Lexical BM25 Tokens & Fused Rank Counters)
        cyan: {
          25: '#f6fdfd',
          50: '#ecfeff',
          100: '#cffafe',
          150: '#bcf7fd',
          200: '#a5f3fc',
          250: '#86eefa',
          300: '#67e8f9',
          350: '#43ddf4',
          400: '#22d3ee',
          450: '#0ec2de',
          500: '#06b6d4',
          550: '#06a2bd',
          600: '#0891b2',
          650: '#0b809d',
          700: '#0e7490',
          750: '#11657e',
          800: '#155e75',
          850: '#165367',
          900: '#164e63',
          925: '#113c4c',
          950: '#083344',
          975: '#041f2a',
        },

        // Indigo Scale (Deep Vector Embeddings & ChromaDB Metrics)
        indigo: {
          25: '#f9faff',
          50: '#eef2ff',
          100: '#e0e7ff',
          150: '#d4ddff',
          200: '#c7d2fe',
          250: '#b6c4fd',
          300: '#a5b4fc',
          350: '#93a3fb',
          400: '#818cf8',
          450: '#7279f5',
          500: '#6366f1',
          550: '#5856ed',
          600: '#4f46e5',
          650: '#483fd8',
          700: '#4338ca',
          750: '#3d34b7',
          800: '#3730a3',
          850: '#342c90',
          900: '#312e81',
          925: '#272467',
          950: '#1e1b4b',
          975: '#12102f',
        },

        // Dedicated Architectural Surface Tokens
        surface: {
          paper: '#ffffff',       // 100% Crisp stark-white physical document sheet
          canvasLight: '#f1f5f9', // Neutral elevated backing in light mode
          canvasDark: '#000000',  // Pure OLED deep black backing in dark mode
          shellLight: '#f8fafc',  // Root light application wrapper
          shellDark: '#09090b',   // Root dark application wrapper
          panelLight: '#ffffff',  // Primary light workstation card
          panelDark: '#18181b',   // Primary dark workstation card
          drawerLight: '#f8fafc', // Collapsible thumbnail drawer (light)
          drawerDark: '#09090b',  // Collapsible thumbnail drawer (dark)
          inputLight: '#ffffff',  // Form input field surface (light)
          inputDark: '#18181b',   // Form input field surface (dark)
          elevatedLight: '#ffffff',
          elevatedDark: '#1f1f23',
        },

        // Dedicated Delineation & 1px Structural Stroke Tokens
        stroke: {
          lightBorder: '#e2e8f0', // Discrete 1px boundary (light)
          darkBorder: '#27272a',  // Discrete 1px boundary (dark)
          focusRing: '#2563eb',   // High-contrast accessibility focus ring
          ruleLight: '#cbd5e1',   // Structural table dividers (light)
          ruleDark: '#3f3f46',    // Structural table dividers (dark)
          accentLight: '#93c5fd', // Active citation outline (light)
          accentDark: '#3b82f6',  // Active citation outline (dark)
        },

        // Semantic Citation Confidence Matrix Tokens
        citation: {
          verifiedBg: 'rgba(16, 185, 129, 0.15)',
          verifiedBorder: '#10b981',
          verifiedActive: 'rgba(16, 185, 129, 0.35)',
          verifiedTag: '#059669',
          groundedBg: 'rgba(37, 99, 235, 0.15)',
          groundedBorder: '#2563eb',
          groundedActive: 'rgba(37, 99, 235, 0.35)',
          groundedTag: '#2563eb',
          reviewBg: 'rgba(245, 158, 11, 0.15)',
          reviewBorder: '#f59e0b',
          reviewActive: 'rgba(245, 158, 11, 0.35)',
          reviewTag: '#d97706',
          alertBg: 'rgba(239, 68, 68, 0.15)',
          alertBorder: '#ef4444',
          alertActive: 'rgba(239, 68, 68, 0.35)',
          alertTag: '#dc2626',
        },

        // Real-Time In-PDF Search Highlight Tokens
        search: {
          matchBg: 'rgba(253, 224, 71, 0.25)',
          matchBorder: 'rgba(250, 204, 21, 0.50)',
          activeBg: 'rgba(251, 191, 36, 0.40)',
          activeBorder: '#f59e0b',
          activeRing: 'rgba(251, 191, 36, 0.30)',
          badgeFill: '#f59e0b',
          badgeText: '#ffffff',
        },

        // Multi-Tenant Isolation Boundaries & Audit Cryptographic Tokens
        tenant: {
          boundary: '#2563eb',
          isolated: '#10b981',
          restricted: '#ef4444',
          audit: '#64748b',
          tagLight: '#eff6ff',
          tagDark: '#1e293b',
        },
      },

      /**
       * -----------------------------------------------------------------------
       * SECTION 2: EXTENDED SPATIAL GRID SYSTEM & METRIC SCALES
       * -----------------------------------------------------------------------
       * Integer multiples of the baseline 4px / 8px spatial grid system.
       * Eliminates fractional layout pixels to prevent sub-pixel blurriness.
       */
      spacing: {
        '0.1': '0.5px',
        '0.2': '1px',
        '0.25': '1px',
        '0.5': '2px',
        '0.75': '3px',
        '1': '4px',
        '1.25': '5px',
        '1.5': '6px',
        '1.75': '7px',
        '2': '8px',
        '2.25': '9px',
        '2.5': '10px',
        '2.75': '11px',
        '3': '12px',
        '3.25': '13px',
        '3.5': '14px',
        '3.75': '15px',
        '4': '16px',
        '4.5': '18px',
        '5': '20px',
        '5.5': '22px',
        '6': '24px',
        '6.5': '26px',
        '7': '28px',
        '7.5': '30px',
        '8': '32px',
        '8.5': '34px',
        '9': '36px',
        '9.5': '38px',
        '10': '40px',
        '10.5': '42px',
        '11': '44px',
        '11.5': '46px',
        '12': '48px',
        '13': '52px',
        '14': '56px',
        '15': '60px',
        '16': '64px',
        '18': '72px',
        '20': '80px',
        '22': '88px',
        '24': '96px',
        '28': '112px',
        '32': '128px',
        '36': '144px',
        '40': '160px',
        '44': '176px',
        '48': '192px',
        '52': '208px',
        '56': '224px',
        '60': '240px',
        '64': '256px',
        '72': '288px',
        '80': '320px',
        '88': '352px',
        '96': '384px',
        '104': '416px',
        '112': '448px',
        '120': '480px',
        '128': '512px',
        '144': '576px',
        '160': '640px',
        '192': '768px',
        '224': '896px',
        '256': '1024px',
        '288': '1152px',
        '320': '1280px',
        '384': '1536px',
        '400': '1600px',

        // Dedicated Component Heights & Widths
        'toolbar-h': '46px',
        'subbar-h': '38px',
        'footer-h': '32px',
        'topbar-h': '56px',
        'search-input-h': '34px',
        'jump-input-w': '36px',
        'chat-composer-min': '74px',

        // Viewport & Drawer Dimension Metrics
        'sidebar-collapsed': '68px',
        'sidebar-expanded': '256px',
        'thumb-drawer-sm': '176px',
        'thumb-drawer-md': '208px',
        'citation-drawer-sm': '288px',
        'citation-drawer-md': '320px',

        // Document Paper Sheet Standard Layout Metrics
        'pdf-paper-w': '680px',
        'pdf-paper-h': '940px',
        'pdf-thumb-w': '150px',
        'pdf-thumb-h': '207px',
        'pdf-max-w': '1100px',
        'pdf-hd-w': '1360px',
        'pdf-hd-h': '1880px',
      },

      /**
       * -----------------------------------------------------------------------
       * SECTION 3: TYPOGRAPHY ARCHITECTURE & TYPE SCALE MATRIX
       * -----------------------------------------------------------------------
       * Native system typeface stacks guaranteeing zero CLS, zero external
       * bandwidth dependencies, and instant rendering on air-gapped platforms.
       */
      fontFamily: {
        // Native System User Interface Font Stack
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],

        // High-Precision Monospace Telemetry & Code Stack
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],

        // Archival / Legal Specification Serif Stack
        serif: [
          'Charter',
          '"Bitstream Charter"',
          'Sitka Text',
          'Cambria',
          'Georgia',
          'serif',
        ],

        // Corporate Platform Branding Display Stack
        display: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },

      // Extended Typography Scale Tuples: [fontSize, { lineHeight, letterSpacing, fontWeight }]
      fontSize: {
        'micro-8': ['8px', { lineHeight: '10px', letterSpacing: '+0.03em', fontWeight: '700' }],
        'micro-9': ['9px', { lineHeight: '12px', letterSpacing: '+0.02em', fontWeight: '700' }],
        'micro-10': ['10px', { lineHeight: '13px', letterSpacing: '+0.015em', fontWeight: '600' }],
        'tele-11': ['11px', { lineHeight: '15px', letterSpacing: '+0.01em', fontWeight: '500' }],
        'xs': ['12px', { lineHeight: '16px', letterSpacing: '0.00em', fontWeight: '400' }],
        'xs-medium': ['12px', { lineHeight: '16px', letterSpacing: '0.00em', fontWeight: '500' }],
        'xs-bold': ['12px', { lineHeight: '16px', letterSpacing: '0.00em', fontWeight: '700' }],
        'sm': ['13px', { lineHeight: '18px', letterSpacing: '-0.005em', fontWeight: '400' }],
        'sm-semibold': ['13px', { lineHeight: '18px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'base': ['14px', { lineHeight: '20px', letterSpacing: '-0.01em', fontWeight: '400' }],
        'base-medium': ['14px', { lineHeight: '20px', letterSpacing: '-0.01em', fontWeight: '500' }],
        'base-semibold': ['14px', { lineHeight: '20px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'base-bold': ['14px', { lineHeight: '20px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'md': ['15px', { lineHeight: '22px', letterSpacing: '-0.015em', fontWeight: '500' }],
        'lg': ['16px', { lineHeight: '24px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'lg-bold': ['16px', { lineHeight: '24px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'xl': ['18px', { lineHeight: '26px', letterSpacing: '-0.025em', fontWeight: '700' }],
        '2xl': ['20px', { lineHeight: '28px', letterSpacing: '-0.03em', fontWeight: '700' }],
        '3xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.035em', fontWeight: '800' }],
        '4xl': ['30px', { lineHeight: '38px', letterSpacing: '-0.04em', fontWeight: '800' }],
        '5xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.045em', fontWeight: '800' }],
        '6xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.05em', fontWeight: '800' }],
      },

      // Optical Letter Spacing Micro-Scales
      letterSpacing: {
        'tighter': '-0.05em',
        'tight': '-0.025em',
        'normal': '0.000em',
        'wide': '+0.015em',
        'wider': '+0.030em',
        'widest': '+0.060em',
        'mono-tight': '-0.010em',
        'mono-wide': '+0.025em',
      },

      // Strict Proportional Line Height Ratios
      lineHeight: {
        'tight-3': '12px',
        'tight-3.5': '14px',
        'tight-4': '16px',
        'tight-4.5': '18px',
        'tight-5': '20px',
        'snug-5.5': '22px',
        'normal-6': '24px',
        'relaxed-7': '28px',
        'loose-8': '32px',
        'loose-10': '40px',
      },

      /**
       * -----------------------------------------------------------------------
       * SECTION 4: SURFACE ELEVATION & 1PX BOUNDARY SHADOW TOKENS
       * -----------------------------------------------------------------------
       * Crisp 1px discrete structural boundaries overriding fuzzy drop shadows.
       */
      boxShadow: {
        'none': 'none',
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'xs': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
        'sm': '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

        // Discrete Enterprise Physical Sheet Shadows
        'sheet-light': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'sheet-dark': '0 4px 12px 0 rgba(0, 0, 0, 0.60), 0 0 0 1px rgba(39, 39, 42, 0.80)',

        // Citation Overlays & Pulsing Rings
        'citation-verified': '0 0 0 2px #10b981, 0 0 12px 2px rgba(16, 185, 129, 0.25)',
        'citation-grounded': '0 0 0 2px #2563eb, 0 0 12px 2px rgba(37, 99, 235, 0.25)',
        'citation-review': '0 0 0 2px #f59e0b, 0 0 12px 2px rgba(245, 158, 11, 0.25)',
        'citation-alert': '0 0 0 2px #ef4444, 0 0 12px 2px rgba(239, 68, 68, 0.25)',
        'search-pulse': '0 0 0 3px #f59e0b, 0 0 14px 4px rgba(251, 191, 36, 0.40)',

        // High-Contrast Focus Rings
        'focus-blue': '0 0 0 2px #ffffff, 0 0 0 4px #2563eb',
        'focus-dark-blue': '0 0 0 2px #18181b, 0 0 0 4px #3b82f6',
      },

      /**
       * -----------------------------------------------------------------------
       * SECTION 5: GEOMETRIC BORDER RADIUS MATRIX
       * -----------------------------------------------------------------------
       * Precise curvature tokens matching technical workstation ergonomics.
       */
      borderRadius: {
        'none': '0px',
        '2xs': '1px',
        'xs': '2px',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
        'full': '9999px',
        'pill': '9999px',
      },

      /**
       * -----------------------------------------------------------------------
       * SECTION 6: Z-INDEX STRUCTURAL HIERARCHY
       * -----------------------------------------------------------------------
       * Strict layering model preventing overlapping glitches across canvases,
       * search highlights, popover tooltips, and floating ingestion modals.
       */
      zIndex: {
        'below': '-1',
        'base': '0',
        'canvas': '1',
        'text-layer': '2',
        'search-match': '5',
        'citation-overlay': '10',
        'citation-selected': '20',
        'toolbar-sub': '25',
        'floating-popover': '30',
        'sidebar-drawer': '40',
        'header-toolbar': '45',
        'modal-backdrop': '50',
        'modal-dialog': '55',
        'toast-banner': '60',
        'tooltip-top': '70',
        'fullscreen-max': '9999',
      },

      /**
       * -----------------------------------------------------------------------
       * SECTION 7: TRANSITION TIMING & BEZIER CURVE DEFINITIONS
       * -----------------------------------------------------------------------
       * Standardized mechanical timing parameters for consistent micro-interactions.
       */
      transitionDuration: {
        '50': '50ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms', // Citation and search overlay hover duration
        '200': '200ms', // Header and panel color transition duration
        '250': '250ms',
        '300': '300ms', // Drawer slide transition duration
        '400': '400ms',
        '500': '500ms',
        '600': '600ms', // Programmatic smooth scrolling jitter suppression
      },

      transitionTimingFunction: {
        'ease-linear': 'linear',
        'ease-standard': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'ease-enter': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        'ease-exit': 'cubic-bezier(0.4, 0.0, 1, 1)',
        'ease-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      /**
       * -----------------------------------------------------------------------
       * SECTION 8: MICRO-INTERACTION KEYFRAME ANIMATIONS
       * -----------------------------------------------------------------------
       * Visual pulses and telemetry streams for live grounded RAG inspection.
       */
      keyframes: {
        // Citation Bounding Box Focus Pulse
        'citation-pulse': {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.85',
            transform: 'scale(1.008)',
          },
        },

        // Real-Time Search Match Flash Pulse
        'search-match-flash': {
          '0%, 100%': {
            boxShadow: '0 0 0 2px #f59e0b, 0 0 12px 3px rgba(245, 158, 11, 0.35)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 0 4px #d97706, 0 0 18px 6px rgba(217, 119, 6, 0.50)',
            transform: 'scale(1.015)',
          },
        },

        // Chain of Thought Telemetry Stream Shimmer
        'shimmer-stream': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },

        // Status Beacon Heartbeat Pulse
        'status-beacon': {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.4',
            transform: 'scale(0.85)',
          },
        },

        // Drawer Slide In Animation
        'drawer-slide-in': {
          '0%': { transform: 'translateX(-100%)', opacity: '0.6' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },

        // Fade In with Subtle Upward Motion
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      animation: {
        'citation-pulse': 'citation-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'search-pulse': 'search-match-flash 1.6s ease-in-out infinite',
        'shimmer': 'shimmer-stream 2.2s linear infinite',
        'beacon': 'status-beacon 2s ease-in-out infinite',
        'drawer-enter': 'drawer-slide-in 0.25s cubic-bezier(0.0, 0.0, 0.2, 1)',
        'fade-up': 'fade-in-up 0.15s ease-out forwards',
      },

      /**
       * -----------------------------------------------------------------------
       * SECTION 9: EXTENDED CSS GRID TRACKS & LAYOUT RATIOS
       * -----------------------------------------------------------------------
       * Grid column configurations powering split-screen workstation flexibility.
       */
      gridTemplateColumns: {
        'split-balanced': '1fr 1fr',
        'split-wide-pdf': 'minmax(0, 8fr) minmax(0, 4fr)',
        'split-wide-chat': 'minmax(0, 5fr) minmax(0, 7fr)',
        'split-sidebar-work': '208px minmax(0, 1fr)',
        'citation-card': '32px 1fr 64px',
        '16': 'repeat(16, minmax(0, 1fr))',
        '24': 'repeat(24, minmax(0, 1fr))',
      },

      // Minimum and Maximum Width Constraints
      minWidth: {
        '0': '0px',
        'pdf-pane': '380px',
        'chat-pane': '320px',
        'jump-input': '32px',
        'search-input': '220px',
        'thumb-card': '120px',
        'sidebar-drawer': '208px',
        'modal-sm': '380px',
        'modal-md': '540px',
      },

      maxWidth: {
        'pdf-canvas': '1200px',
        'chat-bubble': '85%',
        'popover-dialog': '340px',
        'modal-content': '540px',
        'screen-3xl': '1920px',
        'screen-4xl': '2560px',
      },

      // Minimum and Maximum Height Constraints
      minHeight: {
        '0': '0px',
        'workstation': '640px',
        'pdf-page': '480px',
        'chat-composer': '68px',
        'thumbnail': '140px',
        'split-pane': '500px',
      },

      maxHeight: {
        'workstation': 'calc(100vh - 7rem)',
        'chat-stream': 'calc(100vh - 16rem)',
        'popover': '280px',
        'drawer-viewport': 'calc(100vh - 12rem)',
      },

      /**
       * -----------------------------------------------------------------------
       * SECTION 10: ASPECT RATIOS & SCREEN BREAKPOINTS
       * -----------------------------------------------------------------------
       * Standard document aspect ratios for PDF sheets, thumbnails, and viewports.
       */
      aspectRatio: {
        'auto': 'auto',
        'square': '1 / 1',
        'video': '16 / 9',
        'letter': '8.5 / 11',
        'a4': '210 / 297',
        'canvas-doc': '680 / 940',
        'thumbnail': '150 / 207',
      },

      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
        'split-balanced': '1024px',
        'split-expanded': '1440px',
      },
    },
  },
  plugins: [],
};
