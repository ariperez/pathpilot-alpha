'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import LabDashboard from './LabDashboard';
import ErrorBoundary from './ErrorBoundary';
import { Patient } from '@/lib/types';

interface PatientLabCommandCenterProps {
  patientId: string;
  initialPatient: Patient | null;
  initialLabCount: number | null;
}

export default function PatientLabCommandCenter({
  patientId,
  initialPatient,
  initialLabCount
}: PatientLabCommandCenterProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Use existing LabDashboard but with single patient focus */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary>
          <LabDashboard
            initialPatientId={patientId}
            initialPatient={initialPatient}
            initialLabCount={initialLabCount}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}