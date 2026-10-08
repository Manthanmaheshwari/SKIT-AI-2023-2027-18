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
        <div className="text-4xl font-mono font-bold text-slate-600">404</div>
        <h1 className="text-lg font-semibold text-slate-200">Endpoint Not Found</h1>
        <p className="text-xs text-slate-400">
          The requested route does not map to any recognized portal layout within this enterprise tenant.
        </p>
        <button
          type="button"
          onClick={() => navigate('/workspace')}
          className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
        >
          Return to Workspace
        </button>
      </div>
    </div>
  );
}
