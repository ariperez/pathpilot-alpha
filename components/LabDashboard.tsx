'use client';

import { useState, useEffect, useMemo } from 'react';
import { FHIRClient } from '@/lib/fhir-client';
import { LabProcessor } from '@/lib/lab-processor';
import { Patient, LabResult, LabTrend, DiagnosticReport } from '@/lib/types';
import PatientHeader from './PatientHeader';
import CriticalAlerts from './CriticalAlerts';
import LabTrendChart from './LabTrendChart';
import LabCard from './LabCard';
import { TrendChartSkeleton, LabCardSkeleton, ReportsSkeleton } from './LoadingSkeletons';
import { Activity, FileText, TrendingUp, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface LabDashboardProps {
  initialPatientId?: string;
  initialPatient?: Patient | null;
  initialLabCount?: number | null;
}

export default function LabDashboard({
  initialPatientId,
  initialPatient,
  initialLabCount
}: LabDashboardProps = {}) {
  const [currentPatientId, setCurrentPatientId] = useState<string>(
    initialPatientId || ''
  );
  const [patient, setPatient] = useState<Patient | null>(initialPatient || null);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [totalLabCount, setTotalLabCount] = useState<number>(initialLabCount || 0);
  const [labTrends, setLabTrends] = useState<LabTrend[]>([]);
  const [diagnosticReports, setDiagnosticReports] = useState<DiagnosticReport[]>([]);
  const [loading, setLoading] = useState(!initialPatient); // Don't show loading if we have initial data
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trends' | 'recent' | 'reports'>('trends');
  const [lastRefresh, setLastRefresh] = useState(0);

  const fhirClient = new FHIRClient();

  const fetchData = async (patientId: string, isRefresh = false) => {
    if (!patientId) return;

    // Debounce refresh requests (min 2 seconds between refreshes)
    if (isRefresh) {
      const now = Date.now();
      if (now - lastRefresh < 2000) {
        return;
      }
      setLastRefresh(now);
    }

    try {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else if (!initialPatient) {
        setLoading(true);
      }

      // Skip fetching patient and lab count if we have them from server
      const promises = [];

      if (!patient || isRefresh) {
        promises.push(fhirClient.getPatient(patientId));
      }

      // Always fetch lab results and reports (not passed from server yet)
      promises.push(
        fhirClient.getLabResults(patientId),
        fhirClient.getDiagnosticReports(patientId)
      );

      const results = await Promise.all(promises);

      let resultIndex = 0;
      if (!patient || isRefresh) {
        setPatient(results[resultIndex++]);
      }

      const labData = results[resultIndex++];
      const reports = results[resultIndex++];

      setLabResults(labData.results);
      // Only update lab count if we didn't get it from server
      if (!initialLabCount || isRefresh) {
        setTotalLabCount(labData.totalCount);
      }
      setDiagnosticReports(reports);

      // Process trends after data is loaded
      const trends = LabProcessor.processLabTrends(labData.results);
      setLabTrends(trends);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load patient data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePatientChange = (newPatientId: string) => {
    setCurrentPatientId(newPatientId);
    fetchData(newPatientId);
  };

  useEffect(() => {
    if (currentPatientId) {
      fetchData(currentPatientId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use all loaded labs, not arbitrary slice
  const recentLabs = useMemo(() => labResults, [labResults]);

  return (
    <div className={!initialPatientId ? "min-h-screen bg-gray-50" : ""}>
      {/* Header - Only show if not in single patient mode */}
      {!initialPatientId && (
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Activity className="w-8 h-8 text-blue-600" />
                  PathPilot Lab Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Pathology & Lab Intelligence Companion</p>
              </div>
              <button
                onClick={() => fetchData(currentPatientId, true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-6">
          {/* Main Dashboard Content */}
          <div>
            {/* Patient Header */}
            <PatientHeader patient={patient} loading={loading} labCount={totalLabCount} />

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">Error Loading Data</h3>
                    <p className="text-red-700 text-sm mb-4">{error}</p>
                    <button
                      onClick={() => fetchData(currentPatientId, true)}
                      disabled={refreshing}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            )}

        {/* Critical Alerts */}
        <CriticalAlerts labs={labResults} loading={loading} />

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('trends')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'trends'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-400'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Lab Trends
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'recent'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-400'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Recent Labs
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-400'
              }`}
            >
              <FileText className="w-4 h-4" />
              Reports
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'trends' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loading ? (
                  <>
                    <TrendChartSkeleton />
                    <TrendChartSkeleton />
                  </>
                ) : labTrends.length > 0 ? (
                  labTrends.map((trend) => (
                    <LabTrendChart key={trend.labName} trend={trend} />
                  ))
                ) : (
                  <div className="col-span-2 bg-white rounded-lg shadow-sm p-12 text-center">
                    <TrendingUp className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600">No trend data available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recent' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <>
                    <LabCardSkeleton />
                    <LabCardSkeleton />
                    <LabCardSkeleton />
                    <LabCardSkeleton />
                    <LabCardSkeleton />
                    <LabCardSkeleton />
                  </>
                ) : recentLabs.length > 0 ? (
                  recentLabs.map((lab) => (
                    <LabCard key={lab.id} lab={lab} />
                  ))
                ) : (
                  <div className="col-span-3 bg-white rounded-lg shadow-sm p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600">No recent lab results</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reports' && (
              <>
                {loading ? (
                  <ReportsSkeleton />
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Diagnostic Reports</h3>
                    {diagnosticReports.length > 0 ? (
                      <div className="space-y-3">
                        {diagnosticReports.map((report) => (
                          <div key={report.id} className="border-l-4 border-blue-500 pl-4 py-2">
                            <p className="font-medium">{report.name}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(report.effectiveDateTime).toLocaleDateString()}
                            </p>
                            {report.presentedForm && report.presentedForm.length > 0 && (
                              <div className="mt-2">
                                {report.presentedForm.map((form, idx) => (
                                  <a
                                    key={idx}
                                    href={form.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline mr-3"
                                  >
                                    View {form.contentType.includes('pdf') ? 'PDF' : 'Report'}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-600">No diagnostic reports available</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}