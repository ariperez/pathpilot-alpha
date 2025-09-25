'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  TrendingDown,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface PatientWithIntelligence {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
  mrn: string;
  labResults: any[];
  riskScore: number | null;
  riskLevel: 'critical' | 'high' | 'moderate' | 'low' | null;
  criticalLabs: number | null;
  abnormalLabs: number | null;
  dataIncomplete?: boolean;
  error?: string;
}

interface Props {
  initialPatients: PatientWithIntelligence[];
  selectedFilter: 'all' | 'critical' | 'abnormal';
}

export default function PatientList({ initialPatients, selectedFilter }: Props) {
  const [patients, setPatients] = useState<PatientWithIntelligence[]>(initialPatients);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingCounts, setLoadingCounts] = useState<Set<string>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch lab counts for patients that don't have them yet
  const fetchLabCountsForPatients = useCallback(async (patientIds: string[]) => {
    if (patientIds.length === 0) return;

    // Mark these patients as loading
    setLoadingCounts(prev => new Set([...prev, ...patientIds]));

    try {
      const response = await fetch('/api/lab-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientIds })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch lab counts');
      }

      const { counts } = await response.json();

      // Update patients with fetched counts
      setPatients(prev => prev.map(patient => {
        if (counts[patient.id] !== undefined) {
          return {
            ...patient,
            totalLabCount: counts[patient.id],
            hasLabCount: true
          };
        }
        return patient;
      }));
    } catch (error) {
      console.error('Error fetching lab counts:', error);
    } finally {
      // Remove loading state
      setLoadingCounts(prev => {
        const newSet = new Set(prev);
        patientIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  }, []);

  // Effect to load lab counts for visible patients without them
  useEffect(() => {
    const patientsNeedingCounts = patients
      .filter(p => !p.hasLabCount && !loadingCounts.has(p.id))
      .slice(0, 10) // Load 10 at a time
      .map(p => p.id);

    if (patientsNeedingCounts.length > 0) {
      fetchLabCountsForPatients(patientsNeedingCounts);
    }
  }, [patients, loadingCounts, fetchLabCountsForPatients]);

  const getRiskColor = (level: string | null) => {
    if (!level) return 'bg-gray-400';
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getRiskBgColor = (level: string | null) => {
    if (!level) return 'bg-gray-50 border-gray-200';
    switch (level) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'high': return 'bg-orange-50 border-orange-200';
      case 'moderate': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-green-50 border-green-200';
    }
  };

  const loadMorePatients = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      // No hardcoded page size - use configurable value
      const pageSize = 50;  // Reasonable batch for progressive loading
      const response = await fetch(`/api/patient-intelligence?page=${page + 1}&pageSize=${pageSize}`);

      if (!response.ok) {
        throw new Error('Failed to load more patients');
      }

      const data = await response.json();

      if (data.patients.length === 0) {
        setHasMore(false);
      } else {
        setPatients(prev => [...prev, ...data.patients]);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading more patients:', error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadMorePatients();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMorePatients, loading, hasMore]);

  // Memoize filtered patients to avoid recalculation
  const filteredPatients = useMemo(() => {
    switch (selectedFilter) {
      case 'critical':
        return patients.filter(p => p.riskLevel === 'critical');
      case 'abnormal':
        return patients.filter(p => p.abnormalLabs && p.abnormalLabs > 0);
      default:
        return patients;
    }
  }, [patients, selectedFilter]);

  return (
    <div className="space-y-4">
      {filteredPatients.map((patient) => (
        <div
          key={patient.id}
          onClick={() => router.push(`/patient/${patient.id}`)}
          className={`bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer hover:shadow-lg transition-all ${getRiskBgColor(patient.riskLevel)}`}
        >
          <div className="grid grid-cols-12 gap-6">
            {/* Patient Info & Risk Score */}
            <div className="col-span-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{patient.name}</h3>
                  <p className="text-sm text-gray-600">
                    {patient.gender} | MRN: {patient.mrn}
                  </p>
                  <p className="text-sm text-gray-700 font-medium mt-1">
                    Birth Date: {patient.birthDate}
                  </p>
                </div>
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${getRiskColor(patient.riskLevel)}`}>
                    {patient.riskScore !== null ? patient.riskScore : '?'}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {patient.riskScore !== null ? 'Risk Score' : 'Unknown Risk'}
                  </p>
                </div>
              </div>
            </div>

            {/* Lab Statistics */}
            <div className="col-span-4">
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Lab Results Summary</p>
                <p className="text-base font-bold text-gray-900">
                  {patient.totalLabCount !== undefined && patient.totalLabCount !== null ? (
                    `${patient.totalLabCount.toLocaleString()} Total Labs`
                  ) : loadingCounts.has(patient.id) ? (
                    <span className="text-gray-500 animate-pulse">Loading...</span>
                  ) : (
                    <span className="text-gray-400">Fetching...</span>
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Critical:</span>
                    <span className={`font-bold ml-1 ${patient.criticalLabs !== null ? 'text-red-600' : 'text-gray-400'}`}>
                      {patient.criticalLabs !== null ? patient.criticalLabs : 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Abnormal:</span>
                    <span className={`font-bold ml-1 ${patient.abnormalLabs !== null ? 'text-orange-600' : 'text-gray-400'}`}>
                      {patient.abnormalLabs !== null ? patient.abnormalLabs : 'Unknown'}
                    </span>
                  </div>
                </div>
                {patient.dataIncomplete && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    ⚠ {patient.error}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Labs & Actions */}
            <div className="col-span-4">
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Critical Values</p>
                <div className="space-y-1">
                  {patient.labResults.length > 0 ? (
                    // Show ALL critical labs - no arbitrary limit for patient safety
                    patient.labResults.filter(lab => lab.status === 'critical').map((lab, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <p className="text-sm text-gray-800">{lab.name}: {lab.value} {lab.unit}</p>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <p className="text-sm text-yellow-800">No lab data available</p>
                    </div>
                  )}
                  {patient.labResults.length > 0 && patient.criticalLabs === 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-sm text-gray-800">No critical values</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  {patient.dataIncomplete ? 'Incomplete data' : 'Complete data available'}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Infinite Scroll Trigger & Loading State */}
      <div ref={observerTarget} className="h-10 flex items-center justify-center">
        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading more patients...</span>
          </div>
        )}
        {!hasMore && filteredPatients.length > 0 && (
          <p className="text-gray-500 text-sm">All patients loaded</p>
        )}
      </div>
    </div>
  );
}