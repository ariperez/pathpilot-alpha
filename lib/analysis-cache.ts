import { PatientAnalysis } from './medical-analysis';

export interface CachedAnalysisResult {
  analyses: PatientAnalysis[];
  summary: {
    totalPatients: number;
    criticalCount: number;
    highRiskCount: number;
    moderateRiskCount: number;
    lowRiskCount: number;
    abnormalCount: number;
    incompleteDataCount: number;
    analysisTimestamp: string;
    dataQualityScore: number;
  };
  cacheTimestamp: string;
  isStale: boolean;
}

/**
 * Simple in-memory cache for analysis results
 * In production, this would use Redis or similar persistent cache
 */
export class AnalysisCache {
  private static cache: CachedAnalysisResult | null = null;
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Store analysis results in cache
   */
  static setCachedAnalysis(result: Omit<CachedAnalysisResult, 'cacheTimestamp' | 'isStale'>): void {
    this.cache = {
      ...result,
      cacheTimestamp: new Date().toISOString(),
      isStale: false
    };
  }

  /**
   * Retrieve cached analysis results
   */
  static getCachedAnalysis(): CachedAnalysisResult | null {
    if (!this.cache) {
      return null;
    }

    // Check if cache is stale
    const now = new Date().getTime();
    const cacheTime = new Date(this.cache.cacheTimestamp).getTime();
    const isStale = (now - cacheTime) > this.CACHE_TTL_MS;

    return {
      ...this.cache,
      isStale
    };
  }

  /**
   * Clear cached analysis (force refresh)
   */
  static clearCache(): void {
    this.cache = null;
  }

  /**
   * Check if we have fresh cached data
   */
  static hasFreshCache(): boolean {
    const cached = this.getCachedAnalysis();
    return cached !== null && !cached.isStale;
  }

  /**
   * Get individual patient analysis from cache
   */
  static getCachedPatientAnalysis(patientId: string): PatientAnalysis | null {
    const cached = this.getCachedAnalysis();
    if (!cached) return null;

    return cached.analyses.find(a => a.patientId === patientId) || null;
  }

  /**
   * Update a single patient's analysis in cache
   */
  static updatePatientAnalysis(patientAnalysis: PatientAnalysis): void {
    if (!this.cache) return;

    const index = this.cache.analyses.findIndex(a => a.patientId === patientAnalysis.patientId);
    if (index !== -1) {
      this.cache.analyses[index] = patientAnalysis;
      // Update cache timestamp to reflect partial update
      this.cache.cacheTimestamp = new Date().toISOString();
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    const cached = this.getCachedAnalysis();
    if (!cached) {
      return {
        hasCachedData: false,
        cacheAge: null,
        isStale: null,
        patientCount: 0
      };
    }

    const cacheAge = new Date().getTime() - new Date(cached.cacheTimestamp).getTime();

    return {
      hasCachedData: true,
      cacheAge: Math.round(cacheAge / 1000), // seconds
      isStale: cached.isStale,
      patientCount: cached.analyses.length,
      dataQualityScore: cached.summary.dataQualityScore
    };
  }
}