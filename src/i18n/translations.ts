export type Language = 'en' | 'hi' | 'kn';

export interface TranslationDictionary {
  // Brand & Navigation
  brandName: string;
  dashboard: string;
  runRiskScan: string;
  hridayaAiChat: string;
  preventionCoach: string;
  nearbyServices: string;
  healthAnalytics: string;
  doctorPortal: string;
  adminConsole: string;
  logout: string;
  welcomeUser: string;
  presentationDemo: string;
  demoMode: string;

  // Digital Twin
  digitalTwinTitle: string;
  digitalTwinSubtitle: string;
  dataQuality: string;
  confidenceRating: string;
  simulatedStream: string;
  startSimulationStream: string;
  stopSimulationStream: string;
  lastUpdated: string;
  heartRate: string;
  bloodPressure: string;
  spo2: string;
  hrv: string;
  ecgStatus: string;

  // Risk Prediction & Horizons
  riskAssessment: string;
  risk30Day: string;
  risk1Year: string;
  risk5Year: string;
  riskScore: string;
  lowRisk: string;
  moderateRisk: string;
  highRisk: string;
  criticalRisk: string;
  whatCausedRiskChange: string;
  shapTitle: string;
  topRiskFactors: string;
  protectiveFactors: string;
  whatIfSimulator: string;
  currentRisk: string;
  modifiedRisk: string;
  riskDifference: string;
  calculateSimulation: string;
  downloadPdfReport: string;

  // Alerts
  alertCenter: string;
  activeAlerts: string;
  acknowledgeAlert: string;
  alertAcknowledged: string;
  noActiveAlerts: string;

  // Model Versions & Devices
  modelVersionManagement: string;
  activeModels: string;
  deviceManagement: string;
  registerDevice: string;
  deviceName: string;
  deviceType: string;
  deviceStatus: string;

  // Audit
  auditTrailVerification: string;
  verifyAuditChain: string;
  chainStatusValid: string;
  chainStatusInvalid: string;

  // Analytics
  deIdentifiedAnalytics: string;
  totalCohortCount: string;
  piiProtectionNotice: string;

  // Disclaimers
  medicalDisclaimer: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    brandName: 'HridayaDarpana',
    dashboard: 'Dashboard',
    runRiskScan: 'Run Risk Scan',
    hridayaAiChat: 'HridayaAI Chat',
    preventionCoach: 'Prevention Coach',
    nearbyServices: 'Nearby Services',
    healthAnalytics: 'Health Analytics',
    doctorPortal: 'Doctor Portal',
    adminConsole: 'Admin Console',
    logout: 'Logout',
    welcomeUser: 'Welcome',
    presentationDemo: 'Presentation Demo',
    demoMode: 'Demo Mode',

    digitalTwinTitle: 'Physiological Digital Twin',
    digitalTwinSubtitle: 'Real-time 3D cardiovascular state replica with 5-minute telemetry sync.',
    dataQuality: 'Data Quality',
    confidenceRating: 'Confidence Rating',
    simulatedStream: 'Simulated Stream',
    startSimulationStream: 'Start Sensor Stream Simulation',
    stopSimulationStream: 'Stop Sensor Stream Simulation',
    lastUpdated: 'Last Updated',
    heartRate: 'Heart Rate',
    bloodPressure: 'Blood Pressure',
    spo2: 'Blood Oxygen (SpO2)',
    hrv: 'Heart Rate Variability',
    ecgStatus: 'ECG Status',

    riskAssessment: 'Cardiovascular Risk Assessment',
    risk30Day: '30-Day Acute Risk',
    risk1Year: '1-Year MACE Risk',
    risk5Year: '5-Year Long-term Risk',
    riskScore: 'Risk Score',
    lowRisk: 'Low Risk',
    moderateRisk: 'Moderate Risk',
    highRisk: 'High Risk',
    criticalRisk: 'Critical Risk',
    whatCausedRiskChange: 'What caused my risk to change?',
    shapTitle: 'Explainable AI (SHAP) Analysis',
    topRiskFactors: 'Top Risk-Increasing Factors',
    protectiveFactors: 'Protective Factors',
    whatIfSimulator: 'What-If Risk Simulator',
    currentRisk: 'Current Risk',
    modifiedRisk: 'Simulated Risk',
    riskDifference: 'Risk Difference',
    calculateSimulation: 'Run What-If Simulation',
    downloadPdfReport: 'Download PDF Clinical Report',

    alertCenter: 'Dynamic Alert Center',
    activeAlerts: 'Active Alerts',
    acknowledgeAlert: 'Acknowledge',
    alertAcknowledged: 'Acknowledged',
    noActiveAlerts: 'No active risk alerts',

    modelVersionManagement: 'Model Version Management',
    activeModels: 'Active Ensembles',
    deviceManagement: 'Wearable Device Management',
    registerDevice: 'Register Device',
    deviceName: 'Device Name',
    deviceType: 'Device Type',
    deviceStatus: 'Device Status',

    auditTrailVerification: 'Audit Chain Verification',
    verifyAuditChain: 'Verify Tamper-Evident SHA-256 Chain',
    chainStatusValid: 'CHAIN INTEGRITY VALID',
    chainStatusInvalid: 'CORRUPTED CHAIN DETECTED',

    deIdentifiedAnalytics: 'De-Identified Research Analytics',
    totalCohortCount: 'Total Patient Cohort',
    piiProtectionNotice: 'Strictly de-identified. PII metrics excluded.',

    medicalDisclaimer: 'Notice: Decision-support information only. Not a substitute for professional clinical medical diagnosis.',
  },

  hi: {
    brandName: 'हृदयदर्पण',
    dashboard: 'डैशबोर्ड',
    runRiskScan: 'जोखिम स्कैन चलाएं',
    hridayaAiChat: 'हृदयAI चैट',
    preventionCoach: 'निवारण कोच',
    nearbyServices: 'निकटतम स्वास्थ्य सेवाएं',
    healthAnalytics: 'स्वास्थ्य विश्लेषण',
    doctorPortal: 'डॉक्टर पोर्टल',
    adminConsole: 'एडमिन कंसोल',
    logout: 'लॉग आउट',
    welcomeUser: 'स्वागत है',
    presentationDemo: 'डेमो प्रस्तुति',
    demoMode: 'डेमो मोड',

    digitalTwinTitle: 'शारीरिक डिजिटल ट्विन',
    digitalTwinSubtitle: '5-मिनट टेलीमेट्री सिंक के साथ वास्तविक समय 3D हृदय स्थिति।',
    dataQuality: 'डेटा गुणवत्ता',
    confidenceRating: 'विश्वसनीयता रेटिंग',
    simulatedStream: 'सिम्युलेटेड स्ट्रीम',
    startSimulationStream: 'सेंसर स्ट्रीम सिमुलेशन शुरू करें',
    stopSimulationStream: 'सेंसर स्ट्रीम रोकें',
    lastUpdated: 'अंतिम अद्यतन',
    heartRate: 'हृदय गति',
    bloodPressure: 'रक्तचाप',
    spo2: 'रक्त ऑक्सीजन (SpO2)',
    hrv: 'हृदय गति परिवर्तनशीलता',
    ecgStatus: 'ईसीजी स्थिति',

    riskAssessment: 'हृदय संबंधी जोखिम मूल्यांकन',
    risk30Day: '30-दिवसीय जोखिम',
    risk1Year: '1-वर्षीय जोखिम',
    risk5Year: '5-वर्षीय दीर्घकालिक जोखिम',
    riskScore: 'जोखिम स्कोर',
    lowRisk: 'कम जोखिम',
    moderateRisk: 'मध्यम जोखिम',
    highRisk: 'उच्च जोखिम',
    criticalRisk: 'गंभीर जोखिम',
    whatCausedRiskChange: 'मेरे जोखिम में बदलाव का क्या कारण था?',
    shapTitle: 'व्याख्या योग्य एआई (SHAP) विश्लेषण',
    topRiskFactors: 'जोखिम बढ़ाने वाले प्रमुख कारक',
    protectiveFactors: 'सुरक्षात्मक कारक',
    whatIfSimulator: 'व्हाट-इफ जोखिम सिम्युलेटर',
    currentRisk: 'वर्तमान जोखिम',
    modifiedRisk: 'सिम्युलेटेड जोखिम',
    riskDifference: 'जोखिम अंतर',
    calculateSimulation: 'व्हाट-इफ सिमुलेशन चलाएं',
    downloadPdfReport: 'पीडीएफ रिपोर्ट डाउनलोड करें',

    alertCenter: 'डायनामिक अलर्ट सेंटर',
    activeAlerts: 'सक्रिय अलर्ट',
    acknowledgeAlert: 'स्वीकार करें',
    alertAcknowledged: 'स्वीकृत',
    noActiveAlerts: 'कोई सक्रिय जोखिम अलर्ट नहीं',

    modelVersionManagement: 'मॉडल संस्करण प्रबंधन',
    activeModels: 'सक्रिय मॉडल',
    deviceManagement: 'पहनने योग्य उपकरण प्रबंधन',
    registerDevice: 'उपकरण पंजीकृत करें',
    deviceName: 'उपकरण का नाम',
    deviceType: 'उपकरण का प्रकार',
    deviceStatus: 'उपकरण स्थिति',

    auditTrailVerification: 'ऑडिट शृंखला सत्यापन',
    verifyAuditChain: 'SHA-256 शृंखला सत्यापित करें',
    chainStatusValid: 'शृंखला अखंडता मान्य (VALID)',
    chainStatusInvalid: 'दूषित शृंखला पाई गई',

    deIdentifiedAnalytics: 'अनाम अनुसंधान विश्लेषण',
    totalCohortCount: 'कुल रोगी समूह',
    piiProtectionNotice: 'पूरी तरह से अनाम। व्यक्तिगत पहचान बाहर रखी गई है।',

    medicalDisclaimer: 'सूचना: केवल निर्णय-सहायता जानकारी। पेशेवर चिकित्सा निदान का विकल्प नहीं।',
  },

  kn: {
    brandName: 'ಹೃದಯದರ್ಪಣ',
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    runRiskScan: 'ಅಪಾಯ ಸ್ಕ್ಯಾನ್ ನಡೆಸಿ',
    hridayaAiChat: 'ಹೃದಯAI ಚಾಟ್',
    preventionCoach: 'ತಡೆಗಟ್ಟುವಿಕೆ ಕೋಚ್',
    nearbyServices: 'ಸಮೀಪದ ಆರೋಗ್ಯ ಸೇವೆಗಳು',
    healthAnalytics: 'ಆರೋಗ್ಯ ವಿಶ್ಲೇಷಣೆ',
    doctorPortal: 'ವೈದ್ಯರ ಪೋರ್ಟಲ್',
    adminConsole: 'ಅಡ್ಮಿನ್ ಕನ್ಸೋಲ್',
    logout: 'ಲಾಗ್ ಔಟ್',
    welcomeUser: 'ಸ್ವಾಗತ',
    presentationDemo: 'ಡೆಮೋ ಪ್ರಸ್ತುತಿ',
    demoMode: 'ಡೆಮೋ ಮೋಡ್',

    digitalTwinTitle: 'ಶಾರೀರಿಕ ಡಿಜಿಟಲ್ ಟ್ವಿನ್',
    digitalTwinSubtitle: '5-ನಿಮಿಷದ ಟೆಲಿಮೆಟ್ರಿಯೊಂದಿಗೆ ನೈಜ ಸಮಯದ 3D ಹೃದಯ ಸ್ಥಿತಿ.',
    dataQuality: 'ಡೇಟಾ ಗುಣಮಟ್ಟ',
    confidenceRating: 'ವಿಶ್ವಾಸಾರ್ಹತೆ ರೇಟಿಂಗ್',
    simulatedStream: 'ಸಿಮ್ಯುಲೇಟೆಡ್ ಸ್ಟ್ರೀಮ್',
    startSimulationStream: 'ಸಂವೇದಕ ಸ್ಟ್ರೀಮ್ ಸಿಮ್ಯುಲೇಶನ್ ಪ್ರಾರಂಭಿಸಿ',
    stopSimulationStream: 'ಸಂವೇದಕ ಸ್ಟ್ರೀಮ್ ನಿಲ್ಲಿಸಿ',
    lastUpdated: 'ಕೊನೆಯದಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ',
    heartRate: 'ಹೃದಯ ಬಡಿತ',
    bloodPressure: 'ರಕ್ತದೊತ್ತಡ',
    spo2: 'ರಕ್ತದ ಆಮ್ಲಜನಕ (SpO2)',
    hrv: 'ಹೃದಯ ಬಡಿತದ ವ್ಯತ್ಯಾಸ',
    ecgStatus: 'ಇಸಿಜಿ ಸ್ಥಿತಿ',

    riskAssessment: 'ಹೃದಯ ಸಂಬಂಧಿ ಅಪಾಯದ ಮೌಲ್ಯಮಾಪನ',
    risk30Day: '30-ದಿನಗಳ ಅಪಾಯ',
    risk1Year: '1-ವರ್ಷದ ಅಪಾಯ',
    risk5Year: '5-ವರ್ಷಗಳ ದೀರ್ಘಾವಧಿ ಅಪಾಯ',
    riskScore: 'ಅಪಾಯ ಸ್ಕೋರ್',
    lowRisk: 'ಕಡಿಮೆ ಅಪಾಯ',
    moderateRisk: 'ಮಧ್ಯಮ ಅಪಾಯ',
    highRisk: 'ಹೆಚ್ಚಿನ ಅಪಾಯ',
    criticalRisk: 'ತೀವ್ರ ಅಪಾಯ',
    whatCausedRiskChange: 'ನನ್ನ ಅಪಾಯ ಬದಲಾಗಲು ಕಾರಣವೇನು?',
    shapTitle: 'ವಿವರಿಸಬಹುದಾದ AI (SHAP) ವಿಶ್ಲೇಷಣೆ',
    topRiskFactors: 'ಅಪಾಯ ಹೆಚ್ಚಿಸುವ ಪ್ರಮುಖ ಅಂಶಗಳು',
    protectiveFactors: 'ರಕ್ಷಣಾತ್ಮಕ ಅಂಶಗಳು',
    whatIfSimulator: 'ವಾಟ್-ಇಫ್ ಅಪಾಯ ಸಿಮ್ಯುಲೇಟರ್',
    currentRisk: 'ಪ್ರಸ್ತುತ ಅಪಾಯ',
    modifiedRisk: 'ಸಿಮ್ಯುಲೇಟೆಡ್ ಅಪಾಯ',
    riskDifference: 'ಅಪಾಯದ ವ್ಯತ್ಯಾಸ',
    calculateSimulation: 'ವಾಟ್-ಇಫ್ ಸಿಮ್ಯುಲೇಶನ್ ನಡೆಸಿ',
    downloadPdfReport: 'ಪಿಡಿಎಫ್ ವರದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',

    alertCenter: 'ಡೈನಾಮಿಕ್ ಎಚ್ಚರಿಕೆ ಕೇಂದ್ರ',
    activeAlerts: 'ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು',
    acknowledgeAlert: 'ಅಂಗೀಕರಿಸಿ',
    alertAcknowledged: 'ಅಂಗೀಕರಿಸಲಾಗಿದೆ',
    noActiveAlerts: 'ಯಾವುದೇ ಸಕ್ರಿಯ ಅಪಾಯದ ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ',

    modelVersionManagement: 'ಮಾಡೆಲ್ ಆವೃತ್ತಿ ನಿರ್ವಹಣೆ',
    activeModels: 'ಸಕ್ರಿಯ ಮಾಡೆಲ್‌ಗಳು',
    deviceManagement: 'ಧರಿಸಬಹುದಾದ ಸಾಧನ ನಿರ್ವಹಣೆ',
    registerDevice: 'ಸಾಧನ ನೋಂದಾಯಿಸಿ',
    deviceName: 'ಸಾಧನದ ಹೆಸರು',
    deviceType: 'ಸಾಧನದ ಪ್ರಕಾರ',
    deviceStatus: 'ಸಾಧನದ ಸ್ಥಿತಿ',

    auditTrailVerification: 'ಆಡಿಟ್ ಸರಣಿ ಪರಿಶೀಲನೆ',
    verifyAuditChain: 'SHA-256 ಸರಣಿಯನ್ನು ಪರಿಶೀಲಿಸಿ',
    chainStatusValid: 'ಸರಣಿ ಸಮಗ್ರತೆ ಮಾನ್ಯವಾಗಿದೆ (VALID)',
    chainStatusInvalid: 'ದೋಷಪೂರಿತ ಸರಣಿ ಪತ್ತೆಯಾಗಿದೆ',

    deIdentifiedAnalytics: 'ಅನಾಮಧೇಯ ಸಂಶೋಧನಾ ವಿಶ್ಲೇಷಣೆ',
    totalCohortCount: 'ಒಟ್ಟು ರೋಗಿಗಳ ಸಂಖ್ಯೆ',
    piiProtectionNotice: 'ಸಂಪೂರ್ಣ ಅನಾಮಧೇಯ. ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಹೊರಗಿಡಲಾಗಿದೆ.',

    medicalDisclaimer: 'ಸೂಚನೆ: ನಿರ್ಧಾರ ಬೆಂಬಲ ಮಾಹಿತಿ ಮಾತ್ರ. ವೃತ್ತಿಪರ ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆಗೆ ಪರ್ಯಾಯವಲ್ಲ.',
  },
};
