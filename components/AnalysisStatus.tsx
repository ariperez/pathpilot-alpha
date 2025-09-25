'use client';

import { useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AnalysisStatusProps {
  hasAnalysis: boolean;
  isStale: boolean;
  analysisTimestamp?: string;
}

export default function AnalysisStatus({ hasAnalysis, isStale, analysisTimestamp }: AnalysisStatusProps) {
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsRunningAnalysis(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-patients', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        console.warn('Analysis completed with warnings:', result.errors);
      }

      // Refresh the page to show new results
      window.location.reload();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run analysis');
    } finally {
      setIsRunningAnalysis(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!hasAnalysis) {
    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-blue-900">Medical Analysis Required</h3>
            <p className="text-sm text-blue-700 mt-1">
              Complete medical analysis is required to show risk scores and clinical insights.
              This will analyze ALL lab data for all patients (no shortcuts).
            </p>
            <button
              onClick={runAnalysis}
              disabled={isRunningAnalysis}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningAnalysis ? 'animate-spin' : ''}`} />
              {isRunningAnalysis ? 'Running Analysis...' : 'Run Complete Analysis'}
            </button>
            {error && (
              <p className="text-sm text-red-600 mt-2">Error: {error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isStale) {
    return (
      <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-orange-900">Analysis Data is Stale</h3>
            <p className="text-sm text-orange-700 mt-1">
              Medical analysis data is more than 1 hour old.
              {analysisTimestamp && (
                <span> Last updated: {formatTimestamp(analysisTimestamp)}</span>
              )}
            </p>
            <button
              onClick={runAnalysis}
              disabled={isRunningAnalysis}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningAnalysis ? 'animate-spin' : ''}`} />
              {isRunningAnalysis ? 'Refreshing Analysis...' : 'Refresh Analysis'}
            </button>
            {error && (
              <p className="text-sm text-red-600 mt-2">Error: {error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <div className="flex-1">
          <span className="font-medium text-green-900">Medical Analysis Complete</span>
          {analysisTimestamp && (
            <span className="text-sm text-green-700 ml-2">
              Updated: {formatTimestamp(analysisTimestamp)}
            </span>
          )}
        </div>
        <button
          onClick={runAnalysis}
          disabled={isRunningAnalysis}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isRunningAnalysis ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}