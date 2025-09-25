import { FHIRBundle, FHIRObservation, LabResult, Patient } from './types';

const FHIR_BASE_URL = process.env.NEXT_PUBLIC_FHIR_BASE_URL || 'https://mimic-fhir-api.onrender.com';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class FHIRClient {
  private baseUrl: string;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = process.env.NEXT_PUBLIC_CACHE_TTL ?
    parseInt(process.env.NEXT_PUBLIC_CACHE_TTL) :
    5 * 60 * 1000; // Configurable cache TTL, default 5 minutes
  private isServer: boolean;

  constructor(baseUrl: string = FHIR_BASE_URL) {
    this.baseUrl = baseUrl;
    this.isServer = typeof window === 'undefined';
  }

  private getFullUrl(path: string): string {
    // On server, use direct FHIR URL; on client, use API proxy
    if (this.isServer) {
      return `${this.baseUrl}${path}`;
    }
    return `/api/fhir${path}`;
  }

  private getCacheKey(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  async getPatient(patientId: string): Promise<Patient> {
    const cacheKey = this.getCacheKey(`/Patient/${patientId}`);
    const cached = this.getFromCache<Patient>(cacheKey);
    if (cached) return cached;

    const response = await fetch(this.getFullUrl(`/Patient/${patientId}`));

    if (!response.ok) {
      let errorMessage = `Failed to fetch patient ${patientId}: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
          if (errorData.details) errorMessage += ` - ${errorData.details}`;
        }
      } catch {
        // If JSON parsing fails, use default message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Construct meaningful patient identifier from FHIR data
    let patientName = 'Unknown Patient';
    const patientIdentifier = data.identifier?.find((id: any) => id.system === 'http://mimic.mit.edu/fhir/mimic/identifier/patient')?.value;

    if (data.name && data.name[0]) {
      const given = data.name[0].given?.[0] || '';
      const family = data.name[0].family || '';

      // Check if the name is a generic MIMIC dataset name (Patient_XXXXX format)
      if (family && family.startsWith('Patient_') && !given) {
        // Use a more meaningful identifier for display
        patientName = `Patient ID: ${patientIdentifier || family.replace('Patient_', '')}`;
      } else if (given || family) {
        patientName = [given, family].filter(Boolean).join(' ');
      }
    } else if (patientIdentifier) {
      patientName = `Patient ID: ${patientIdentifier}`;
    }

    const patient: Patient = {
      id: data.id,
      name: patientName,
      birthDate: data.birthDate,
      gender: data.gender,
      mrn: data.identifier?.find((id: { type?: { coding?: Array<{ code?: string }> } }) => id.type?.coding?.[0]?.code === 'MR')?.value || patientIdentifier || 'Unknown'
    };

    this.setCache(cacheKey, patient);
    return patient;
  }

  async getPatients(pageSize?: number, offset?: number): Promise<Patient[]> {
    // Build query params for pagination strategy
    let queryParams = '';
    if (pageSize) {
      queryParams = `?_count=${pageSize}`;
      if (offset) {
        queryParams += `&_offset=${offset}`;
      }
    }

    const cacheKey = this.getCacheKey(`/Patient${queryParams}`);
    const cached = this.getFromCache<Patient[]>(cacheKey);
    if (cached) return cached;

    // Fetch all available patients or use pagination if specified
    const response = await fetch(this.getFullUrl(`/Patient${queryParams}`))

    if (!response.ok) {
      let errorMessage = `Failed to fetch patients: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
          if (errorData.details) errorMessage += ` - ${errorData.details}`;
        }
      } catch {
        // If JSON parsing fails, use default message
      }
      throw new Error(errorMessage);
    }

    const bundle: FHIRBundle = await response.json();

    if (!bundle.entry) {
      return [];
    }

    const patients = bundle.entry.map(entry => {
      // Construct meaningful patient identifier from FHIR data
      let patientName = 'Unknown Patient';
      const patientIdentifier = entry.resource.identifier?.find((id: any) => id.system === 'http://mimic.mit.edu/fhir/mimic/identifier/patient')?.value;

      if (entry.resource.name && entry.resource.name[0]) {
        const given = entry.resource.name[0].given?.[0] || '';
        const family = entry.resource.name[0].family || '';

        // Check if the name is a generic MIMIC dataset name (Patient_XXXXX format)
        if (family && family.startsWith('Patient_') && !given) {
          // Use a more meaningful identifier for display
          patientName = `Patient ID: ${patientIdentifier || family.replace('Patient_', '')}`;
        } else if (given || family) {
          patientName = [given, family].filter(Boolean).join(' ');
        }
      } else if (patientIdentifier) {
        patientName = `Patient ID: ${patientIdentifier}`;
      }

      return {
        id: entry.resource.id,
        name: patientName,
        birthDate: entry.resource.birthDate,
        gender: entry.resource.gender,
        mrn: entry.resource.identifier?.find((id: { type?: { coding?: Array<{ code?: string }> } }) => id.type?.coding?.[0]?.code === 'MR')?.value || patientIdentifier || 'Unknown'
      };
    });

    this.setCache(cacheKey, patients);
    return patients;
  }

  async getLabCount(patientId: string): Promise<number> {
    // Get just the total count using _summary=count
    const queryParams = `patient=${patientId}&_summary=count`;
    const response = await fetch(this.getFullUrl(`/Observation?${queryParams}`));

    if (!response.ok) {
      throw new Error(`Failed to fetch lab count for patient ${patientId}: ${response.status}`);
    }

    const bundle = await response.json();

    if (bundle.total === undefined) {
      throw new Error(`FHIR server did not return total count for patient ${patientId}`);
    }

    return bundle.total;
  }

  async getRecentLabs(
    patientId: string,
    limit: number = 10
  ): Promise<{ labs: LabResult[], criticalCount: number, abnormalCount: number }> {
    // Fetch a small sample of recent labs to analyze and display
    const queryParams = `patient=${patientId}&_count=${limit}&_sort=-date`;

    const response = await fetch(this.getFullUrl(`/Observation?${queryParams}`));

    if (!response.ok) {
      throw new Error(`Failed to fetch lab results for patient ${patientId}: ${response.status}`);
    }

    const bundle: FHIRBundle = await response.json();

    if (!bundle.entry) {
      return { labs: [], criticalCount: 0, abnormalCount: 0 };
    }

    const labs = bundle.entry.map(entry => this.transformObservation(entry.resource));

    // Count critical and abnormal from this sample
    const criticalCount = labs.filter(lab => lab.status === 'critical').length;
    const abnormalCount = labs.filter(lab => lab.status === 'abnormal').length;

    return { labs, criticalCount, abnormalCount };
  }

  private transformObservation(obs: FHIRObservation): LabResult {
    const value = obs.valueQuantity?.value;
    const unit = obs.valueQuantity?.unit || '';
    const refRange = obs.referenceRange?.[0];

    let status: 'normal' | 'critical' | 'abnormal' = 'normal';

    if (value !== undefined && refRange) {
      if (refRange.high && value > refRange.high.value) {
        status = value > refRange.high.value * 1.5 ? 'critical' : 'abnormal';
      } else if (refRange.low && value < refRange.low.value) {
        status = value < refRange.low.value * 0.5 ? 'critical' : 'abnormal';
      }
    }

    const labName = obs.code.text || obs.code.coding?.[0]?.display || 'Unknown';

    return {
      id: obs.id,
      code: obs.code.coding?.[0]?.code || '',
      name: labName,
      value: value ?? 'N/A',
      unit,
      referenceRange: refRange ? {
        low: refRange.low?.value,
        high: refRange.high?.value,
        text: refRange.text
      } : undefined,
      status,
      effectiveDateTime: obs.effectiveDateTime,
      category: 'laboratory',
      interpretation: obs.interpretation?.[0]?.coding?.[0]?.display
    };
  }

  async getLabResults(patientId: string, limit: number = 50) {
    try {
      // Fetch recent lab observations for this patient
      const queryParams = `patient=${patientId}&_count=${limit}&_sort=-date`;
      const response = await fetch(this.getFullUrl(`/Observation?${queryParams}`));

      if (!response.ok) {
        console.error(`Failed to fetch lab results for patient ${patientId}: ${response.status}`);
        return {
          results: [],
          totalCount: 0
        };
      }

      const bundle: FHIRBundle = await response.json();

      if (!bundle.entry) {
        return {
          results: [],
          totalCount: bundle.total || 0
        };
      }

      // Transform FHIR Observations to LabResult format
      const results = bundle.entry.map(entry => this.transformObservation(entry.resource));

      return {
        results,
        totalCount: bundle.total || results.length
      };
    } catch (error) {
      console.error('Error fetching lab results:', error);
      return {
        results: [],
        totalCount: 0
      };
    }
  }

  async getDiagnosticReports(patientId: string) {
    // Temporary stub - return empty array for now
    return [];
  }
}