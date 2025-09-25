import { NextRequest, NextResponse } from 'next/server';

const FHIR_BASE_URL = process.env.NEXT_PUBLIC_FHIR_BASE_URL || 'https://mimic-fhir-api.onrender.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${FHIR_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`Proxying FHIR request to: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json+fhir',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    // Handle specific error codes with medical-appropriate messages
    if (!response.ok) {
      const contentType = response.headers.get('content-type');

      if (response.status === 502 || response.status === 503) {
        console.error(`CRITICAL: FHIR server unavailable - ${response.status}`);
        return NextResponse.json(
          {
            error: 'CRITICAL: FHIR server is unavailable',
            details: 'The medical data server is currently down. This is a critical issue that prevents access to patient data.',
            action: 'Contact system administrator immediately',
            status: response.status
          },
          { status: 503 }
        );
      }

      if (response.status === 504) {
        console.error('CRITICAL: FHIR server timeout');
        return NextResponse.json(
          {
            error: 'CRITICAL: Medical data request timed out',
            details: 'The FHIR server took too long to respond. Patient data may be incomplete.',
            action: 'Retry or contact support',
            status: response.status
          },
          { status: 504 }
        );
      }

      // Check if the response is HTML (likely an error page)
      if (contentType?.includes('text/html')) {
        return NextResponse.json(
          {
            error: 'FHIR server returned invalid response',
            details: 'Expected medical data but received an error page',
            status: response.status
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: `FHIR API error: ${response.status}`,
          details: `Failed to retrieve medical data from FHIR server`,
          status: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('CRITICAL FHIR proxy error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          {
            error: 'Medical data request timed out',
            details: 'The FHIR server did not respond within 30 seconds',
            action: 'Check server status and retry'
          },
          { status: 504 }
        );
      }

      if (error.message.includes('fetch')) {
        return NextResponse.json(
          {
            error: 'Network error accessing FHIR server',
            details: error.message,
            action: 'Check network connectivity'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Critical error accessing medical data',
        details: error instanceof Error ? error.message : 'Unknown error',
        action: 'Contact system administrator'
      },
      { status: 500 }
    );
  }
}