import { useState, useEffect } from 'react';

export interface TourStep {
  title: string;
  description: string;
  targetId: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Cardio Risk Scan Wizard",
    description: "Submit your age, blood pressure, stress rating, and ECG status. The system trains classification models, outputs prediction reports, and charts SHAP weights.",
    targetId: "tour-prediction"
  },
  {
    title: "HridyaAI Chat Consultation",
    description: "Consult with expert agents. HridyaAI routes questions to Diet, Workout, or Emergency sub-routines. You can also upload blood CBC and ECG sheets to trigger Gemini vision OCR.",
    targetId: "tour-chat"
  },
  {
    title: "Hyperlocal Healthcare Maps",
    description: "Pinpoint real nearby doctors, clinics, gyms, and pharmacies using Leaflet and live OpenStreetMap Overpass searches centered around your browser coordinates.",
    targetId: "tour-nearby"
  },
  {
    title: "Family & Portal Systems",
    description: "Register caregivers and link family members to track their cardiac safety. Authorized accounts can access Doctor consoles to log clinical notes.",
    targetId: "tour-dashboard"
  }
];

export const useGuidedTour = () => {
  const [activeStep, setActiveStep] = useState<number>(-1);

  useEffect(() => {
    // Auto-trigger tour on first login if not completed before
    const isCompleted = localStorage.getItem('hridya_tour_completed');
    if (!isCompleted) {
      setActiveStep(0);
    }
  }, []);

  const nextStep = () => {
    if (activeStep < TOUR_STEPS.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      completeTour();
    }
  };

  const completeTour = () => {
    setActiveStep(-1);
    localStorage.setItem('hridya_tour_completed', 'true');
  };

  const resetTour = () => {
    localStorage.removeItem('hridya_tour_completed');
    setActiveStep(0);
  };

  return {
    activeStep,
    currentStep: activeStep >= 0 ? TOUR_STEPS[activeStep] : null,
    nextStep,
    completeTour,
    resetTour,
    isTourActive: activeStep >= 0
  };
};
