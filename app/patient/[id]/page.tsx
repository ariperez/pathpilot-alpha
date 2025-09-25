import { Suspense } from 'react';
import { FHIRClient } from '@/lib/fhir-client';
import PatientLabCommandCenter from '@/components/PatientLabCommandCenter';
import { Patient } from '@/lib/types';

// Server component - fetches data on server
async function getPatientData(patientId: string) {
  const fhirClient = new FHIRClient();

  try {
    // Fetch fast data in parallel
    const [patient, labCount] = await Promise.all([
      fhirClient.getPatient(patientId),
      fhirClient.getLabCount(patientId)
    ]);

    return { patient, labCount };
  } catch (error) {
    console.error('Error fetching patient data:', error);
    // Return nulls if fetch fails
    return { patient: null, labCount: null };
  }
}

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  // Fetch data on server
  const { patient, labCount } = await getPatientData(params.id);

  return (
    <PatientLabCommandCenter
      patientId={params.id}
      initialPatient={patient}
      initialLabCount={labCount}
    />
  );
}