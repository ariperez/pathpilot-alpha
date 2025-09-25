import { NextRequest, NextResponse } from 'next/server';
import { FHIRClient } from '@/lib/fhir-client';

export async function POST(request: NextRequest) {
  try {
    const { patientIds } = await request.json();

    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return NextResponse.json(
        { error: 'patientIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent timeout
    const MAX_BATCH_SIZE = 20;
    const idsToFetch = patientIds.slice(0, MAX_BATCH_SIZE);

    const fhirClient = new FHIRClient();

    // Fetch counts in parallel
    const counts = await Promise.all(
      idsToFetch.map(async (patientId) => {
        try {
          const count = await fhirClient.getLabCount(patientId);
          return { patientId, count, success: true };
        } catch (error) {
          console.error(`Failed to fetch count for patient ${patientId}:`, error);
          return { patientId, count: null, success: false };
        }
      })
    );

    // Return as a map for easy lookup
    const countMap = counts.reduce((acc, item) => {
      acc[item.patientId] = item.count;
      return acc;
    }, {} as Record<string, number | null>);

    return NextResponse.json({ counts: countMap });
  } catch (error) {
    console.error('Batch lab counts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lab counts' },
      { status: 500 }
    );
  }
}