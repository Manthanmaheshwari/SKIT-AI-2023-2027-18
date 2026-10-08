import React from 'react';

/**
 * Common SVG Icon properties interface.
 * @typedef {Object} IconProps
 * @property {string} [className] - Additional CSS classes.
 * @property {number|string} [size] - Width and height dimension in pixels.
 * @property {string} [strokeWidth] - SVG stroke width.
 */

/**
 * Workspace / Document Search Icon
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function WorkspaceIcon({ className = 'w-5 h-5', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

/**
 * Admin Management Icon
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function AdminIcon({ className = 'w-5 h-5', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
      <path d="M16 11.37A8 8 0 0 1 20 18v2H4v-2a8 8 0 0 1 4-6.63" />
      <circle cx="19" cy="8" r="2" />
      <circle cx="5" cy="8" r="2" />
    </svg>
  );
}

/**
 * Audit Log / Shield Compliance Icon
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function AuditIcon({ className = 'w-5 h-5', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/**
 * Sidebar Collapse / Left Chevron Icon
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function ChevronLeftIcon({ className = 'w-5 h-5', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/**
 * Sidebar Expand / Right Chevron Icon
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function ChevronRightIcon({ className = 'w-5 h-5', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/**
 * Mobile Hamburger Menu Icon
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function MenuIcon({ className = 'w-5 h-5', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

/**
 * Close / Dismiss Icon
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function CloseIcon({ className = 'w-5 h-5', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Search Icon
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function SearchIcon({ className = 'w-4 h-4', size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/**
 * Tenant Organization Icon
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function TenantIcon({ className = 'w-4 h-4', size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 21h18" />
      <path d="M9 8h1" />
      <path d="M9 12h1" />
      <path d="M9 16h1" />
      <path d="M14 8h1" />
      <path d="M14 12h1" />
      <path d="M14 16h1" />
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
    </svg>
  );
}

/**
 * Lock / Restricted Route Icon
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function LockIcon({ className = 'w-4 h-4', size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/**
 * Shield Alert / Warning Icon
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function ShieldAlertIcon({ className = 'w-5 h-5', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/**
 * Enterprise Platform Logo Symbol
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
export function PlatformLogo({ className = 'w-6 h-6', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
