import { Suspense } from 'react';
import { Brain } from 'lucide-react';
import { FHIRClient } from '../lib/fhir-client';
import { AnalysisCache } from '../lib/analysis-cache';
import PatientIntelligenceContent from './PatientIntelligenceContent';
import HealthStatus from '../components/HealthStatus';


// Server-side data fetching with proper medical error handling
async function getPatientIntelligenceData() {
  try {
    const fhirClient = new FHIRClient();

    // Fetch ALL patients - no artificial limits
    const patients = await fhirClient.getPatients();
    const totalPatients = patients.length;

    // Fetch lab counts for first 10 patients only (for fast initial load)
    const INITIAL_FETCH_COUNT = 10;
    const patientsWithData = await Promise.all(
      patients.map(async (patient, index) => {
        if (index < INITIAL_FETCH_COUNT) {
          // Fetch lab count for first 10 patients
          try {
            const labCount = await fhirClient.getLabCount(patient.id);
            return {
              ...patient,
              labResults: [],
              totalLabCount: labCount,
              hasLabCount: true
            };
          } catch (error) {
            console.error(`Failed to fetch lab count for patient ${patient.id}:`, error);
            return {
              ...patient,
              labResults: [],
              totalLabCount: null,
              hasLabCount: false
            };
          }
        } else {
          // Return remaining patients without lab counts (will load client-side)
          return {
            ...patient,
            labResults: [],
            totalLabCount: null,
            hasLabCount: false
          };
        }
      })
    );

    // Check for cached analysis results
    const cachedAnalysis = AnalysisCache.getCachedAnalysis();

    // Merge patient data with analysis results
    const patientsWithAnalysis = patientsWithData.map(patient => {
      const analysis = cachedAnalysis?.analyses.find(a => a.patientId === patient.id);
      if (analysis) {
        return {
          ...patient,
          riskLevel: analysis.riskLevel,
          riskScore: analysis.riskScore,
          criticalLabs: analysis.criticalCount,
          abnormalLabs: analysis.abnormalCount,
          dataIncomplete: analysis.dataCompleteness < 0.8
        };
      }
      return patient;
    });

    // Use cached summary if available, otherwise show not implemented
    const summary = cachedAnalysis?.summary || {
      totalPatients,
      criticalCount: null, // Not implemented
      highRiskCount: null, // Not implemented
      abnormalCount: null, // Not implemented
      incompleteDataCount: null // Not implemented
    };

    return {
      patients: patientsWithAnalysis,
      summary,
      warnings: [],
      timestamp: new Date().toISOString(),
      analysisStatus: {
        hasAnalysis: cachedAnalysis !== null,
        isStale: cachedAnalysis?.isStale || false,
        analysisTimestamp: cachedAnalysis?.summary.analysisTimestamp
      }
    };

  } catch (error) {
    console.error('CRITICAL: Server-side patient intelligence error:', error);
    throw error; // Let error boundary handle it
  }
}



// Next.js Server Component
export default async function PatientIntelligencePage() {
  const data = await getPatientIntelligenceData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Brain className="w-8 h-8 text-indigo-600" />
                PathPilot Clinical Risk Assessment
              </h1>
              <p className="text-gray-600 mt-1">FHIR-Compliant Clinical Risk Assessment & Lab Analytics</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div>Loading patient details...</div>}>
          <PatientIntelligenceContent initialData={data} />
        </Suspense>
      </div>

      {/* Health Status Monitor */}
      <HealthStatus />
    </div>
  );
}

// Add loading.tsx file for this route
export function generateMetadata() {
  return {
    title: 'PathPilot - Clinical Risk Assessment',
    description: 'FHIR-compliant clinical risk assessment and lab analytics dashboard'
  };
}