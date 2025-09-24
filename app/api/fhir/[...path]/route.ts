import { NextRequest, NextResponse } from 'next/server';

// Use production API server
const FHIR_BASE_URL = process.env.NEXT_PUBLIC_FHIR_BASE_URL || 'https://pathpilot-api.onrender.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${FHIR_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`Proxying request to: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json+fhir',
      },
      // Add timeout
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      // Check if the response is HTML (likely an error page)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/html')) {
        return NextResponse.json(
          { error: 'Backend API service is currently suspended or unavailable. The Render.com service may need to be reactivated.' },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: `FHIR API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('FHIR proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FHIR data' },
      { status: 500 }
    );
  }
}