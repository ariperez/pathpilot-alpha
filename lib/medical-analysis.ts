import { LabResult } from './types';

export interface PatientAnalysis {
  patientId: string;
  riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  riskScore: number;
  criticalCount: number;
  abnormalCount: number;
  totalLabCount: number;
  lastCriticalDate?: string;
  lastAbnormalDate?: string;
  analysisDate: string;
  dataCompleteness: number; // 0-1 scale
}

export class MedicalAnalysis {
  /**
   * Performs complete medical analysis on ALL lab data for a patient
   * NEVER uses artificial limits - analyzes complete dataset
   */
  static analyzePatientLabs(patientId: string, allLabResults: LabResult[]): PatientAnalysis {
    if (!allLabResults || allLabResults.length === 0) {
      return {
        patientId,
        riskLevel: 'low',
        riskScore: 0,
        criticalCount: 0,
        abnormalCount: 0,
        totalLabCount: 0,
        analysisDate: new Date().toISOString(),
        dataCompleteness: 0
      };
    }

    // Analyze ALL results - no artificial limits
    const criticalLabs = allLabResults.filter(lab => lab.status === 'critical');
    const abnormalLabs = allLabResults.filter(lab => lab.status === 'abnormal');
    const normalLabs = allLabResults.filter(lab => lab.status === 'normal');

    const criticalCount = criticalLabs.length;
    const abnormalCount = abnormalLabs.length;
    const totalLabCount = allLabResults.length;

    // Calculate risk score based on complete data
    let riskScore = 0;

    // Critical labs have exponential impact on risk
    riskScore += criticalCount * 50;

    // Abnormal labs contribute to risk
    riskScore += abnormalCount * 5;

    // Recent critical/abnormal labs increase risk
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentCritical = criticalLabs.filter(lab =>
      new Date(lab.effectiveDateTime) > oneWeekAgo
    ).length;

    const recentAbnormal = abnormalLabs.filter(lab =>
      new Date(lab.effectiveDateTime) > oneWeekAgo
    ).length;

    // Weight recent results more heavily
    riskScore += recentCritical * 25;
    riskScore += recentAbnormal * 10;

    // Determine risk level based on complete analysis
    let riskLevel: 'critical' | 'high' | 'moderate' | 'low';

    if (criticalCount > 0) {
      riskLevel = 'critical';
    } else if (riskScore >= 100) {
      riskLevel = 'high';
    } else if (riskScore >= 30) {
      riskLevel = 'moderate';
    } else {
      riskLevel = 'low';
    }

    // Calculate data completeness
    const dataCompleteness = this.calculateDataCompleteness(allLabResults);

    // Find most recent critical and abnormal dates
    const lastCriticalDate = criticalLabs.length > 0
      ? criticalLabs
          .sort((a, b) => new Date(b.effectiveDateTime).getTime() - new Date(a.effectiveDateTime).getTime())[0]
          .effectiveDateTime
      : undefined;

    const lastAbnormalDate = abnormalLabs.length > 0
      ? abnormalLabs
          .sort((a, b) => new Date(b.effectiveDateTime).getTime() - new Date(a.effectiveDateTime).getTime())[0]
          .effectiveDateTime
      : undefined;

    return {
      patientId,
      riskLevel,
      riskScore,
      criticalCount,
      abnormalCount,
      totalLabCount,
      lastCriticalDate,
      lastAbnormalDate,
      analysisDate: new Date().toISOString(),
      dataCompleteness
    };
  }

  /**
   * Calculate data completeness score based on lab result quality
   */
  private static calculateDataCompleteness(labResults: LabResult[]): number {
    if (labResults.length === 0) return 0;

    let completenessScore = 0;
    let totalChecks = 0;

    labResults.forEach(lab => {
      // Check for required fields
      if (lab.value !== undefined && lab.value !== null) {
        completenessScore++;
      }
      totalChecks++;

      if (lab.unit) {
        completenessScore++;
      }
      totalChecks++;

      if (lab.referenceRange) {
        completenessScore++;
      }
      totalChecks++;

      if (lab.effectiveDateTime) {
        completenessScore++;
      }
      totalChecks++;
    });

    return totalChecks > 0 ? completenessScore / totalChecks : 0;
  }

  /**
   * Aggregate analyses for summary statistics
   */
  static aggregateAnalyses(analyses: PatientAnalysis[]) {
    const totalPatients = analyses.length;
    const criticalCount = analyses.filter(a => a.riskLevel === 'critical').length;
    const highRiskCount = analyses.filter(a => a.riskLevel === 'high').length;
    const moderateRiskCount = analyses.filter(a => a.riskLevel === 'moderate').length;
    const lowRiskCount = analyses.filter(a => a.riskLevel === 'low').length;

    // Count patients with abnormal labs (not risk level)
    const abnormalCount = analyses.filter(a => a.abnormalCount > 0).length;

    // Count patients with incomplete data
    const incompleteDataCount = analyses.filter(a => a.dataCompleteness < 0.8).length;

    // Find most recent analysis
    const analysisTimestamp = analyses.length > 0
      ? analyses
          .sort((a, b) => new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime())[0]
          .analysisDate
      : new Date().toISOString();

    return {
      totalPatients,
      criticalCount,
      highRiskCount,
      moderateRiskCount,
      lowRiskCount,
      abnormalCount,
      incompleteDataCount,
      analysisTimestamp,
      dataQualityScore: analyses.reduce((sum, a) => sum + a.dataCompleteness, 0) / analyses.length
    };
  }

  /**
   * Validate analysis results for medical safety
   */
  static validateAnalysis(analysis: PatientAnalysis): string[] {
    const warnings: string[] = [];

    if (analysis.dataCompleteness < 0.5) {
      warnings.push(`Patient ${analysis.patientId}: Low data completeness (${(analysis.dataCompleteness * 100).toFixed(1)}%)`);
    }

    if (analysis.totalLabCount === 0) {
      warnings.push(`Patient ${analysis.patientId}: No lab results available`);
    }

    if (analysis.criticalCount > 0 && !analysis.lastCriticalDate) {
      warnings.push(`Patient ${analysis.patientId}: Critical labs detected but no date available`);
    }

    // Check for unrealistic values that might indicate data issues
    if (analysis.criticalCount > analysis.totalLabCount * 0.5) {
      warnings.push(`Patient ${analysis.patientId}: Unusually high percentage of critical labs (${analysis.criticalCount}/${analysis.totalLabCount})`);
    }

    return warnings;
  }
}