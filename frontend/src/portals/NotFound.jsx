import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Not Found (404) Route Fallback Component
 *
 * @component
 * @returns {JSX.Element}
 */
export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-5xl font-mono font-bold text-slate-300 dark:text-slate-700">404</div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Endpoint Not Found</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested route does not map to any recognized portal layout within this enterprise tenant.
        </p>
        <button
          type="button"
          onClick={() => navigate('/workspace')}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          Return to Workspace
        </button>
      </div>
    </div>
  );
}
