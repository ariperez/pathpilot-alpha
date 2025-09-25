import { NextRequest, NextResponse } from 'next/server';
import { FHIRClient } from '../../../lib/fhir-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const fhirClient = new FHIRClient();

    // Get paginated patients
    const offset = (page - 1) * pageSize;
    const patients = await fhirClient.getPatients(pageSize, offset);

    // For each patient, get lab count and small sample
    const patientsWithData = await Promise.all(
      patients.map(async (patient) => {
        try {
          // Get total count efficiently
          const totalLabCount = await fhirClient.getLabCount(patient.id);

          // Get small sample of recent labs for display and counting
          const { labs, criticalCount, abnormalCount } = await fhirClient.getRecentLabs(patient.id, 20);

          // Calculate risk based on sample
          const riskScore = criticalCount * 15 + abnormalCount * 3;
          let riskLevel: 'critical' | 'high' | 'moderate' | 'low' = 'low';
          if (criticalCount > 0) riskLevel = 'critical';
          else if (riskScore >= 50) riskLevel = 'high';
          else if (riskScore >= 20) riskLevel = 'moderate';

          return {
            ...patient,
            totalLabCount,
            recentLabs: labs.filter(l => l.status === 'critical' || l.status === 'abnormal').slice(0, 5),
            criticalCount,
            abnormalCount,
            riskScore,
            riskLevel
          };
        } catch (error) {
          console.error(`Failed to get data for patient ${patient.id}:`, error);
          return {
            ...patient,
            totalLabCount: null,
            recentLabs: [],
            criticalCount: null,
            abnormalCount: null,
            riskScore: null,
            riskLevel: null,
            error: error instanceof Error ? error.message : 'Failed to load data'
          };
        }
      })
    );

    // Calculate summary from loaded patients
    const summary = {
      totalPatients: patients.length,
      criticalCount: patientsWithData.filter(p => p.riskLevel === 'critical').length,
      highRiskCount: patientsWithData.filter(p => p.riskLevel === 'high').length,
      abnormalCount: patientsWithData.filter(p => p.abnormalCount && p.abnormalCount > 0).length,
      incompleteDataCount: patientsWithData.filter(p => p.riskScore === null).length
    };

    return NextResponse.json({
      patients: patientsWithData,
      summary,
      page,
      pageSize,
      hasMore: patients.length === pageSize,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Patient intelligence error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    );
  }
}