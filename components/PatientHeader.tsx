'use client';

import { Patient } from '@/lib/types';
import { User, Calendar } from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';

interface PatientHeaderProps {
  patient: Patient | null;
  loading: boolean;
  labCount?: number;
}

export default function PatientHeader({ patient, loading, labCount }: PatientHeaderProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!patient) return null;

  const age = patient.birthDate
    ? differenceInYears(new Date(), parseISO(patient.birthDate))
    : 'Unknown';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          Patient ID: {patient.mrn}
          {labCount !== undefined && labCount !== null && (
            <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {labCount} labs
            </span>
          )}
        </h2>
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          Active Patient
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <span className="text-gray-700 font-medium">DOB:</span>
          <span className="font-medium text-gray-900">
            {patient.birthDate ? format(parseISO(patient.birthDate), 'MMM dd, yyyy') : 'Unknown'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-700 font-medium">Age:</span>
          <span className="font-medium text-gray-900">{age} years</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-700 font-medium">Gender:</span>
          <span className="font-medium text-gray-900 capitalize">{patient.gender}</span>
        </div>
      </div>
    </div>
  );
}