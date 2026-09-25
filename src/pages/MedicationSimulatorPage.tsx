import React from 'react';
import MedicationSimulatorView from '../components/MedicationSimulator/MedicationSimulatorView';

export default function MedicationSimulatorPage() {
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 min-h-screen pb-12">
      <MedicationSimulatorView />
    </div>
  );
}
