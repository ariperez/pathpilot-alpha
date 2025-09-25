'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, X } from 'lucide-react';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'unknown';
  timestamp: string;
  checks: {
    fhir_server: {
      url: string;
      status: 'healthy' | 'unhealthy' | 'unknown';
      responseTime: number | null;
      error: string | null;
      details: any;
    };
    api_proxy: {
      status: 'healthy' | 'unhealthy';
      message: string;
    };
  };
  warning?: string;
  action?: string;
}

export default function HealthStatus() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const checkHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);

      // Don't auto-expand - less intrusive
      // if (data.status === 'unhealthy') {
      //   setIsExpanded(true);
      // }
    } catch (error) {
      console.error('Failed to check health:', error);
      setHealth({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          fhir_server: {
            url: 'unknown',
            status: 'unknown',
            responseTime: null,
            error: 'Failed to check server health',
            details: null
          },
          api_proxy: {
            status: 'unhealthy',
            message: 'Health check failed'
          }
        }
      });
      // Don't auto-expand on error either
      // setIsExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!health && loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-100 rounded-lg shadow-lg p-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Checking system health...</span>
        </div>
      </div>
    );
  }

  if (!health || isDismissed) return null;

  const isHealthy = health.status === 'healthy';
  const fhirHealthy = health.checks.fhir_server.status === 'healthy';

  return (
    <div className={`fixed bottom-4 right-4 ${isExpanded ? 'w-96' : 'w-auto'} z-40 transition-all`}>
      <div
        className={`rounded-lg shadow-md border ${
          isHealthy ? 'bg-green-50/90 border-green-200' : 'bg-red-50/90 border-red-200'
        } backdrop-blur-sm`}
      >
        {/* Header - Always visible */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isHealthy ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm ${isHealthy ? 'text-green-800' : 'text-red-800'}`}>
                {isHealthy ? 'System OK' : 'System Issues'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  checkHealth();
                }}
                className="p-1 hover:bg-white/50 rounded"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDismissed(true);
                }}
                className="p-1 hover:bg-white/50 rounded text-gray-600 hover:text-gray-800"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="border-t border-gray-200 p-3 space-y-3">
            {/* FHIR Server Status */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">FHIR Server</span>
                {fhirHealthy ? (
                  <span className="text-xs text-green-600">
                    {health.checks.fhir_server.responseTime}ms
                  </span>
                ) : (
                  <span className="text-xs text-red-600">Unavailable</span>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {health.checks.fhir_server.url}
              </div>
              {health.checks.fhir_server.error && (
                <div className="mt-1 p-2 bg-red-100 rounded text-xs text-red-700">
                  {health.checks.fhir_server.error}
                </div>
              )}
            </div>

            {/* API Proxy Status */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">API Proxy</span>
                <span className={`text-xs ${
                  health.checks.api_proxy.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {health.checks.api_proxy.status === 'healthy' ? 'Operational' : 'Issues'}
                </span>
              </div>
            </div>

            {/* Medical Safety Warning */}
            {health.warning && (
              <div className="p-2 bg-yellow-100 border border-yellow-200 rounded">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="text-yellow-800 font-medium">{health.warning}</p>
                    {health.action && (
                      <p className="text-yellow-700 mt-1">{health.action}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Last Check */}
            <div className="text-xs text-gray-500 text-right">
              Last checked: {new Date(health.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}