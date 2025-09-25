import { NextResponse } from 'next/server';

const FHIR_BASE_URL = process.env.NEXT_PUBLIC_FHIR_BASE_URL || 'https://mimic-fhir-api.onrender.com';

export async function GET() {
  const results = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    checks: {
      fhir_server: {
        url: FHIR_BASE_URL,
        status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown',
        responseTime: null as number | null,
        error: null as string | null,
        details: null as any
      },
      api_proxy: {
        status: 'healthy' as 'healthy' | 'unhealthy',
        message: 'API proxy is operational'
      }
    }
  };

  try {
    // Test FHIR server connectivity
    const startTime = Date.now();
    const response = await fetch(`${FHIR_BASE_URL}/metadata`, {
      headers: {
        'Accept': 'application/json+fhir',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout for health check
    });

    const responseTime = Date.now() - startTime;
    results.checks.fhir_server.responseTime = responseTime;

    if (response.ok) {
      const data = await response.json();
      results.checks.fhir_server.status = 'healthy';
      results.checks.fhir_server.details = {
        fhirVersion: data.fhirVersion,
        software: data.software,
        responseTime: `${responseTime}ms`
      };
    } else {
      results.checks.fhir_server.status = 'unhealthy';
      results.checks.fhir_server.error = `Server returned ${response.status}: ${response.statusText}`;

      if (response.status === 502 || response.status === 503) {
        results.checks.fhir_server.error = 'FHIR server is down or suspended. May need to be reactivated.';
      }
    }
  } catch (error) {
    results.checks.fhir_server.status = 'unhealthy';
    results.checks.fhir_server.error = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof Error && error.name === 'AbortError') {
      results.checks.fhir_server.error = 'FHIR server timeout - no response within 10 seconds';
    }
  }

  // Determine overall status
  const overallHealthy = results.checks.fhir_server.status === 'healthy';
  results.status = overallHealthy ? 'healthy' : 'unhealthy';

  // Add medical safety warning if unhealthy
  if (!overallHealthy) {
    (results as any).warning = '⚠️ CRITICAL: Medical data server is unavailable. Do not make clinical decisions without access to complete patient data.';
    (results as any).action = 'Contact system administrator immediately to restore FHIR server access.';
  }

  return NextResponse.json(
    results,
    {
      status: overallHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': overallHealthy ? 'healthy' : 'unhealthy'
      }
    }
  );
}