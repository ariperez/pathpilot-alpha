import { NextRequest, NextResponse } from 'next/server';
import { FHIRClient } from '@/lib/fhir-client';
import { MedicalAnalysis, PatientAnalysis } from '@/lib/medical-analysis';
import { AnalysisCache } from '@/lib/analysis-cache';

export async function POST(request: NextRequest) {
  try {
    const fhirClient = new FHIRClient();

    console.log('Starting complete patient analysis...');
    const startTime = Date.now();

    // Fetch all patients
    const patients = await fhirClient.getPatients();
    console.log(`Found ${patients.length} patients to analyze`);

    if (patients.length === 0) {
      return NextResponse.json({ error: 'No patients found' }, { status: 404 });
    }

    // Analyze each patient with ALL their lab data
    const analyses: PatientAnalysis[] = [];
    const errors: string[] = [];

    // Process patients in batches to avoid overwhelming the server
    const BATCH_SIZE = 10;
    for (let i = 0; i < patients.length; i += BATCH_SIZE) {
      const batch = patients.slice(i, i + BATCH_SIZE);

      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(patients.length / BATCH_SIZE)}`);

      const batchResults = await Promise.allSettled(
        batch.map(async (patient) => {
          try {
            // Fetch ALL lab results for this patient (no limits)
            const labData = await fhirClient.getLabResults(patient.id, 10000); // High limit to get all

            // Perform complete medical analysis
            const analysis = MedicalAnalysis.analyzePatientLabs(patient.id, labData.results);

            // Validate analysis for medical safety
            const warnings = MedicalAnalysis.validateAnalysis(analysis);
            if (warnings.length > 0) {
              errors.push(...warnings);
            }

            return analysis;
          } catch (error) {
            const errorMsg = `Failed to analyze patient ${patient.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(errorMsg);

            // Return minimal analysis for failed patients
            return {
              patientId: patient.id,
              riskLevel: 'low' as const,
              riskScore: 0,
              criticalCount: 0,
              abnormalCount: 0,
              totalLabCount: 0,
              analysisDate: new Date().toISOString(),
              dataCompleteness: 0
            };
          }
        })
      );

      // Extract successful results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          analyses.push(result.value);
        }
      });
    }

    // Generate summary statistics
    const summary = MedicalAnalysis.aggregateAnalyses(analyses);

    // Cache the complete results
    AnalysisCache.setCachedAnalysis({
      analyses,
      summary
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Analysis completed in ${duration}ms`);
    console.log(`Summary: ${summary.criticalCount} critical, ${summary.highRiskCount} high risk, ${summary.abnormalCount} abnormal labs`);

    return NextResponse.json({
      success: true,
      summary,
      analysisStats: {
        patientsAnalyzed: analyses.length,
        totalPatients: patients.length,
        duration,
        errors: errors.length,
        dataQualityScore: summary.dataQualityScore
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Return first 10 errors
    });

  } catch (error) {
    console.error('Analysis endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze patients',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return current analysis status
    const cached = AnalysisCache.getCachedAnalysis();
    const stats = AnalysisCache.getCacheStats();

    if (!cached) {
      return NextResponse.json({
        hasAnalysis: false,
        message: 'No analysis available. Run POST /api/analyze-patients to generate analysis.',
        cacheStats: stats
      });
    }

    return NextResponse.json({
      hasAnalysis: true,
      summary: cached.summary,
      isStale: cached.isStale,
      cacheStats: stats,
      analysisTimestamp: cached.summary.analysisTimestamp
    });

  } catch (error) {
    console.error('Analysis status error:', error);
    return NextResponse.json(
      { error: 'Failed to get analysis status' },
      { status: 500 }
    );
  }
}