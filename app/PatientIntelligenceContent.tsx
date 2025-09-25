'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  Users,
  AlertCircle,
} from 'lucide-react';
import PatientList from './PatientList';
import AnalysisStatus from '../components/AnalysisStatus';

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

interface PatientIntelligenceResponse {
  patients: PatientWithIntelligence[];
  summary: {
    totalPatients: number;
    criticalCount: number;
    highRiskCount: number;
    abnormalCount: number;
    incompleteDataCount: number;
  };
  warnings: string[];
  timestamp: string;
  analysisStatus: {
    hasAnalysis: boolean;
    isStale: boolean;
    analysisTimestamp?: string;
  };
}

interface Props {
  initialData: PatientIntelligenceResponse;
}

export default function PatientIntelligenceContent({ initialData }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'abnormal'>('all');

  return (
    <>
      {/* Analysis Status */}
      <AnalysisStatus
        hasAnalysis={initialData.analysisStatus.hasAnalysis}
        isStale={initialData.analysisStatus.isStale}
        analysisTimestamp={initialData.analysisStatus.analysisTimestamp}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{initialData.summary.totalPatients}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
          initialData.summary.criticalCount !== null
            ? initialData.summary.criticalCount > 0
              ? 'border-red-500'
              : 'border-green-500'
            : 'border-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Risk</p>
              <p className={`text-2xl font-bold ${
                initialData.summary.criticalCount !== null
                  ? initialData.summary.criticalCount > 0
                    ? 'text-red-600'
                    : 'text-green-600'
                  : 'text-gray-400'
              }`}>
                {initialData.summary.criticalCount !== null
                  ? initialData.summary.criticalCount
                  : 'Not implemented'}
              </p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${
              initialData.summary.criticalCount !== null
                ? initialData.summary.criticalCount > 0
                  ? 'text-red-500'
                  : 'text-green-500'
                : 'text-gray-300'
            }`} />
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
          initialData.summary.highRiskCount !== null
            ? initialData.summary.highRiskCount > 0
              ? 'border-orange-500'
              : 'border-green-500'
            : 'border-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Risk</p>
              <p className={`text-2xl font-bold ${
                initialData.summary.highRiskCount !== null
                  ? initialData.summary.highRiskCount > 0
                    ? 'text-orange-600'
                    : 'text-green-600'
                  : 'text-gray-400'
              }`}>
                {initialData.summary.highRiskCount !== null
                  ? initialData.summary.highRiskCount
                  : 'Not implemented'}
              </p>
            </div>
            <AlertCircle className={`w-8 h-8 ${
              initialData.summary.highRiskCount !== null
                ? initialData.summary.highRiskCount > 0
                  ? 'text-orange-500'
                  : 'text-green-500'
                : 'text-gray-300'
            }`} />
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
          initialData.summary.abnormalCount !== null
            ? initialData.summary.abnormalCount > 0
              ? 'border-yellow-500'
              : 'border-green-500'
            : 'border-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Abnormal Labs</p>
              <p className={`text-2xl font-bold ${
                initialData.summary.abnormalCount !== null
                  ? initialData.summary.abnormalCount > 0
                    ? 'text-yellow-600'
                    : 'text-green-600'
                  : 'text-gray-400'
              }`}>
                {initialData.summary.abnormalCount !== null
                  ? initialData.summary.abnormalCount
                  : 'Not implemented'}
              </p>
            </div>
            <TrendingDown className={`w-8 h-8 ${
              initialData.summary.abnormalCount !== null
                ? initialData.summary.abnormalCount > 0
                  ? 'text-yellow-500'
                  : 'text-green-500'
                : 'text-gray-300'
            }`} />
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
          initialData.summary.incompleteDataCount !== null
            ? initialData.summary.incompleteDataCount > 0
              ? 'border-purple-500'
              : 'border-green-500'
            : 'border-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Incomplete Data</p>
              <p className={`text-2xl font-bold ${
                initialData.summary.incompleteDataCount !== null
                  ? initialData.summary.incompleteDataCount > 0
                    ? 'text-purple-600'
                    : 'text-green-600'
                  : 'text-gray-400'
              }`}>
                {initialData.summary.incompleteDataCount !== null
                  ? initialData.summary.incompleteDataCount
                  : 'Not implemented'}
              </p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${
              initialData.summary.incompleteDataCount !== null
                ? initialData.summary.incompleteDataCount > 0
                  ? 'text-purple-500'
                  : 'text-green-500'
                : 'text-gray-300'
            }`} />
          </div>
        </div>
      </div>

      {/* Patient List - Show real patients */}
      <PatientList
        initialPatients={initialData.patients}
        selectedFilter={selectedFilter}
      />
    </>
  );
}